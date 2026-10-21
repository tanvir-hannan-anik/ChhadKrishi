"""
Supabase Postgres + pgvector storage for the knowledge base.

Tables (separate from the chat's existing rag_document/rag_chunk FAO tables, which keep working):
  kb_document   one row per ingested source (title, bibliographic data, embedding model, hash)
  kb_chunk      passages with page references, heading path, metadata arrays, a generated
                full-text vector (keyword search) and the embedding (vector search)

Row-level security is enabled with no policies: Supabase's public REST API cannot read or
write these tables; only this service's direct database connection can.
"""

from __future__ import annotations

import json
import logging
import re
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Iterator, Sequence

log = logging.getLogger("rag.db")


def schema_sql(dimensions: int) -> str:
    return f"""
create extension if not exists vector;

create table if not exists kb_document (
  id text primary key,
  title text not null,
  authors text,
  publisher text,
  year integer,
  isbn text,
  source_file text not null,
  sha256 text not null,
  page_count integer not null,
  embedding_model text not null,
  embedding_dimensions integer not null,
  license_note text,
  ingest_report jsonb,
  ingested_at timestamptz not null default now()
);

create table if not exists kb_chunk (
  id text primary key,
  document_id text not null references kb_document(id) on delete cascade,
  chunk_index integer not null,
  chunk_type text not null,
  volume text,
  article text not null,
  article_authors text,
  section text,
  subsection text,
  heading_path text not null,
  page_start integer not null,
  page_end integer not null,
  page_label_start text,
  page_label_end text,
  doi text,
  content text not null,
  crops text[] not null default '{{}}',
  diseases text[] not null default '{{}}',
  soils text[] not null default '{{}}',
  seasons text[] not null default '{{}}',
  nutrients text[] not null default '{{}}',
  tsv tsvector generated always as (
    setweight(to_tsvector('english', coalesce(heading_path, '')), 'A') ||
    setweight(to_tsvector('english', content), 'B')
  ) stored,
  embedding vector({dimensions})
);

create index if not exists kb_chunk_embedding_idx on kb_chunk using hnsw (embedding vector_cosine_ops);
create index if not exists kb_chunk_tsv_idx on kb_chunk using gin (tsv);
create index if not exists kb_chunk_doc_page_idx on kb_chunk (document_id, page_start);
create index if not exists kb_chunk_crops_idx on kb_chunk using gin (crops);
create index if not exists kb_chunk_diseases_idx on kb_chunk using gin (diseases);

alter table kb_document enable row level security;
alter table kb_chunk enable row level security;
"""


CHUNK_COLUMNS = (
    "id", "document_id", "chunk_index", "chunk_type", "volume", "article", "article_authors", "section", "subsection",
    "heading_path", "page_start", "page_end", "page_label_start", "page_label_end", "doi", "content",
    "crops", "diseases", "soils", "seasons", "nutrients",
)
RESULT_COLUMNS = (
    "c.id, c.document_id, c.chunk_type, c.volume, c.article, c.article_authors, c.section, c.subsection, c.heading_path, "
    "c.page_start, c.page_end, c.page_label_start, c.page_label_end, c.doi, c.content, c.crops, c.diseases, c.soils, "
    "c.seasons, c.nutrients, d.title as document_title, d.publisher, d.year"
)


def vector_literal(vector: Sequence[float]) -> str:
    return "[" + ",".join(f"{v:.7f}" for v in vector) + "]"


_TS_WORD = re.compile(r"[a-z][a-z0-9\-]{1,30}")
_STOP = {"the", "and", "for", "with", "what", "how", "which", "when", "does", "are", "can", "should", "from", "that", "this", "into", "about", "why", "use", "used"}


def or_tsquery(keywords: Sequence[str]) -> str:
    """Builds an OR tsquery from free keywords; phrases become <-> sequences. Input is sanitised."""
    parts: list[str] = []
    for keyword in keywords:
        words = [w for w in _TS_WORD.findall(keyword.lower()) if w not in _STOP]
        words = [w.replace("-", "") for w in words if w.replace("-", "")]
        if not words:
            continue
        parts.append(" <-> ".join(words) if len(words) > 1 else words[0])
    return " | ".join(dict.fromkeys(parts))


@dataclass
class Filters:
    document_ids: list[str] | None = None
    crops: list[str] | None = None
    diseases: list[str] | None = None
    chunk_types: list[str] | None = None

    def sql(self, params: list) -> str:
        clauses = []
        if self.document_ids:
            clauses.append("c.document_id = any(%s)")
            params.append(self.document_ids)
        if self.crops:
            clauses.append("c.crops && %s")
            params.append(self.crops)
        if self.diseases:
            clauses.append("c.diseases && %s")
            params.append(self.diseases)
        if self.chunk_types:
            clauses.append("c.chunk_type = any(%s)")
            params.append(self.chunk_types)
        return (" and " + " and ".join(clauses)) if clauses else ""


class KnowledgeBase:
    """Thin data-access layer. A psycopg connection pool is created lazily on first use."""

    def __init__(self, database_url: str, dimensions: int) -> None:
        self.database_url = database_url
        self.dimensions = dimensions
        self._pool = None

    @property
    def configured(self) -> bool:
        return bool(self.database_url)

    def _get_pool(self):
        if self._pool is None:
            from psycopg_pool import ConnectionPool

            url = re.sub(r"[?&]sslmode=[^&]+", "", self.database_url)
            local = bool(re.search(r"@(localhost|127\.0\.0\.1)[:/]", url))
            # Supabase's transaction pooler (port 6543) does not support prepared statements.
            self._pool = ConnectionPool(
                url,
                min_size=1,
                max_size=4,
                kwargs={"sslmode": "disable" if local else "require", "prepare_threshold": None, "autocommit": True},
                open=True,
            )
        return self._pool

    @contextmanager
    def connection(self) -> Iterator:
        with self._get_pool().connection() as conn:
            yield conn

    def close(self) -> None:
        if self._pool is not None:
            self._pool.close()

    # ---------- ingestion ----------

    def ensure_schema(self) -> None:
        with self.connection() as conn:
            row = conn.execute(
                "select format_type(atttypid, atttypmod) from pg_attribute where attrelid = to_regclass('kb_chunk') and attname = 'embedding'"
            ).fetchone()
            if row and row[0] != f"vector({self.dimensions})":
                raise RuntimeError(f"kb_chunk.embedding is {row[0]} but the embedding model produces vector({self.dimensions}); re-create the table or change RAG_EMBEDDING_DIMENSIONS")
            conn.execute(schema_sql(self.dimensions))

    def upsert_document(self, doc: dict) -> None:
        with self.connection() as conn:
            conn.execute(
                """insert into kb_document (id, title, authors, publisher, year, isbn, source_file, sha256, page_count,
                       embedding_model, embedding_dimensions, license_note, ingest_report)
                   values (%(id)s, %(title)s, %(authors)s, %(publisher)s, %(year)s, %(isbn)s, %(source_file)s, %(sha256)s,
                       %(page_count)s, %(embedding_model)s, %(embedding_dimensions)s, %(license_note)s, %(ingest_report)s)
                   on conflict (id) do update set title = excluded.title, authors = excluded.authors, publisher = excluded.publisher,
                       year = excluded.year, isbn = excluded.isbn, source_file = excluded.source_file, sha256 = excluded.sha256,
                       page_count = excluded.page_count, embedding_model = excluded.embedding_model,
                       embedding_dimensions = excluded.embedding_dimensions, license_note = excluded.license_note,
                       ingest_report = excluded.ingest_report, ingested_at = now()""",
                {**doc, "ingest_report": json.dumps(doc.get("ingest_report") or {})},
            )

    def document(self, document_id: str) -> dict | None:
        with self.connection() as conn:
            cur = conn.execute("select id, embedding_model, embedding_dimensions, sha256 from kb_document where id = %s", (document_id,))
            row = cur.fetchone()
            return dict(zip([c.name for c in cur.description], row)) if row else None

    def existing_chunk_ids(self, document_id: str) -> set[str]:
        with self.connection() as conn:
            return {r[0] for r in conn.execute("select id from kb_chunk where document_id = %s and embedding is not null", (document_id,))}

    def insert_chunks(self, rows: list[dict], vectors: list[list[float]]) -> None:
        columns = ", ".join(CHUNK_COLUMNS) + ", embedding"
        placeholders = ", ".join(["%s"] * len(CHUNK_COLUMNS)) + ", %s::vector"
        updates = ", ".join(f"{c} = excluded.{c}" for c in CHUNK_COLUMNS[1:]) + ", embedding = excluded.embedding"
        sql = f"insert into kb_chunk ({columns}) values ({placeholders}) on conflict (id) do update set {updates}"
        with self.connection() as conn:
            with conn.transaction():
                with conn.cursor() as cur:
                    cur.executemany(sql, [tuple(row.get(c) for c in CHUNK_COLUMNS) + (vector_literal(v),) for row, v in zip(rows, vectors)])

    def delete_stale_chunks(self, document_id: str, keep_ids: set[str]) -> int:
        with self.connection() as conn:
            cur = conn.execute("delete from kb_chunk where document_id = %s and not (id = any(%s))", (document_id, list(keep_ids)))
            return cur.rowcount

    # ---------- retrieval ----------

    def _rows(self, cur) -> list[dict]:
        names = [c.name for c in cur.description]
        return [dict(zip(names, row)) for row in cur.fetchall()]

    def vector_search(self, vector: Sequence[float], limit: int, filters: Filters | None = None) -> list[dict]:
        params: list = [vector_literal(vector)]
        where = (filters or Filters()).sql(params)
        params += [vector_literal(vector), limit]
        sql = f"""select {RESULT_COLUMNS}, 1 - (c.embedding <=> %s::vector) as similarity
                  from kb_chunk c join kb_document d on d.id = c.document_id
                  where c.embedding is not null {where}
                  order by c.embedding <=> %s::vector limit %s"""
        with self.connection() as conn:
            # More candidates from the HNSW graph than the default 40 when filters prune results.
            conn.execute("set hnsw.ef_search = 100")
            return self._rows(conn.execute(sql, params))

    def keyword_search(self, keywords: Sequence[str], limit: int, filters: Filters | None = None) -> list[dict]:
        query = or_tsquery(keywords)
        if not query:
            return []
        params: list = [query]
        where = (filters or Filters()).sql(params)
        params.append(limit)
        sql = f"""select {RESULT_COLUMNS}, ts_rank_cd(c.tsv, q, 32) as keyword_rank
                  from kb_chunk c join kb_document d on d.id = c.document_id, to_tsquery('english', %s) q
                  where c.tsv @@ q {where}
                  order by keyword_rank desc limit %s"""
        with self.connection() as conn:
            return self._rows(conn.execute(sql, params))

    def chunks_by_ids(self, ids: Sequence[str]) -> list[dict]:
        with self.connection() as conn:
            cur = conn.execute(f"select {RESULT_COLUMNS} from kb_chunk c join kb_document d on d.id = c.document_id where c.id = any(%s)", (list(ids),))
            return self._rows(cur)

    def stats(self) -> dict:
        with self.connection() as conn:
            docs = conn.execute("select id, title, embedding_model, page_count, ingested_at::text from kb_document order by id").fetchall()
            counts = dict(conn.execute("select document_id, count(*) from kb_chunk group by document_id").fetchall())
        return {"documents": [{"id": d[0], "title": d[1], "embedding_model": d[2], "pages": d[3], "ingested_at": d[4], "chunks": counts.get(d[0], 0)} for d in docs]}

    def embedding_models(self) -> set[str]:
        with self.connection() as conn:
            return {r[0] for r in conn.execute("select distinct embedding_model from kb_document")}
