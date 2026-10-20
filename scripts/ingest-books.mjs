#!/usr/bin/env node
/**
 * Builds the chat's reference library (RAG): downloads the books listed in rag/sources.json,
 * splits them into overlapping passages, embeds each passage and stores everything in
 * Postgres + pgvector (Supabase).
 *
 *   npm run rag:ingest              ingest into SUPABASE_DB_URL
 *   npm run rag:ingest -- --dry-run download and chunk only; print statistics
 *
 * Needs SUPABASE_DB_URL and an embedding provider key (AI_GATEWAY_API_KEY or OPENROUTER_API_KEY)
 * in .env.local. Safe to re-run: each document's passages are replaced in one transaction.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { extractText, getDocumentProxy } from "unpdf";

const DRY_RUN = process.argv.includes("--dry-run");
const EMBEDDING_MODEL = process.env.CHHADKRISHI_EMBEDDING_MODEL || "openai/text-embedding-3-small";
const DIMENSIONS = 1536;
const CHUNK_CHARS = 1100;
const OVERLAP_CHARS = 200;
const BATCH = 48;

// ---------- download & extract ----------

async function download(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await fetch(url, { headers: { "User-Agent": "ChhadKrishi-RAG-ingest/1.0" } });
    if (response.ok) return new Uint8Array(await response.arrayBuffer());
    if (attempt === 3) throw new Error(`${url}: HTTP ${response.status}`);
    await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
  }
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function htmlToText(html) {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/h\d|\/li|\/tr|\/div)[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#\d+|[a-z]+);/gi, (m, e) => (e[0] === "#" ? String.fromCharCode(Number(e.slice(1))) : (ENTITIES[e.toLowerCase()] ?? m)))
    .replace(/(Previous Page|Top of Page|Next Page|Table of Contents)/g, " ");
}

async function partText(url) {
  const bytes = await download(url);
  if (url.toLowerCase().endsWith(".pdf")) {
    const { text } = await extractText(await getDocumentProxy(bytes), { mergePages: false });
    return text.join("\n\n");
  }
  return htmlToText(new TextDecoder("latin1").decode(bytes));
}

function clean(text) {
  return text
    .replace(/\r/g, "")
    .replace(/(\w)-\n(\w)/g, "$1$2") // re-join hyphenated line breaks
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Paragraph-aware chunks of ~CHUNK_CHARS with OVERLAP_CHARS of shared context. */
function chunk(text) {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.replace(/\n/g, " ").trim()).filter((p) => p.length > 1);
  const chunks = [];
  let current = "";
  const push = () => {
    if (current.trim().length >= 120) chunks.push(current.trim());
    current = current.length > OVERLAP_CHARS ? current.slice(-OVERLAP_CHARS).replace(/^\S*\s/, "") : "";
  };
  for (const paragraph of paragraphs) {
    // Split very long paragraphs on sentence boundaries.
    const pieces = paragraph.length > CHUNK_CHARS ? paragraph.match(/[^.!?]+[.!?]+["')]?\s*|[^.!?]+$/g) ?? [paragraph] : [paragraph];
    for (const piece of pieces) {
      if (current.length + piece.length > CHUNK_CHARS && current.length > OVERLAP_CHARS) push();
      current += (current && !current.endsWith(" ") ? "\n" : "") + piece;
    }
  }
  if (current.trim().length >= 120) chunks.push(current.trim());
  return chunks;
}

// ---------- embeddings ----------

async function embed(inputs) {
  const gateway = process.env.AI_GATEWAY_API_KEY;
  const key = gateway || process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("Set AI_GATEWAY_API_KEY or OPENROUTER_API_KEY to create embeddings.");
  const endpoint = gateway ? "https://ai-gateway.vercel.sh/v1/embeddings" : "https://openrouter.ai/api/v1/embeddings";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "ChhadKrishi" },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: inputs }),
  });
  if (!response.ok) throw new Error(`Embedding request failed: HTTP ${response.status} ${await response.text()}`);
  const { data } = await response.json();
  const vectors = data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  if (vectors.length !== inputs.length || vectors.some((v) => v.length !== DIMENSIONS)) {
    throw new Error(`Expected ${inputs.length} embeddings of ${DIMENSIONS} dimensions from ${EMBEDDING_MODEL}.`);
  }
  return vectors;
}

// ---------- database ----------

const SCHEMA = `
create extension if not exists vector;

create table if not exists rag_document (
  id text primary key,
  title text not null,
  publisher text not null,
  year integer,
  url text not null,
  license text not null,
  ingested_at timestamptz not null default now()
);

create table if not exists rag_chunk (
  id bigserial primary key,
  document_id text not null references rag_document(id) on delete cascade,
  part_label text not null,
  part_url text not null,
  chunk_index integer not null,
  content text not null,
  embedding vector(${DIMENSIONS}) not null
);

create index if not exists rag_chunk_embedding_idx on rag_chunk using hnsw (embedding vector_cosine_ops);
create index if not exists rag_chunk_document_idx on rag_chunk (document_id);

-- Supabase exposes the public schema over its REST API: with RLS on and no policies, only the
-- server's direct database connection can read or write these tables.
alter table rag_document enable row level security;
alter table rag_chunk enable row level security;
`;

function connect() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("SUPABASE_DB_URL is not set (Supabase → Project Settings → Database → Connection string).");
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  return new pg.Pool({ connectionString: url.replace(/[?&]sslmode=[^&]+/, ""), ssl: local ? false : { rejectUnauthorized: false }, max: 2 });
}

// ---------- main ----------

const { documents } = JSON.parse(await readFile(path.join(import.meta.dirname, "..", "rag", "sources.json"), "utf8"));
const pool = DRY_RUN ? null : connect();
if (pool) await pool.query(SCHEMA);

let total = 0;
for (const doc of documents) {
  const rows = [];
  for (const part of doc.parts) {
    const pieces = chunk(clean(await partText(part.url)));
    pieces.forEach((content, index) => rows.push({ part, index, content }));
    console.log(`  ${doc.id} · ${part.label}: ${pieces.length} passages`);
  }
  total += rows.length;
  if (DRY_RUN) {
    console.log(`${doc.id}: ${rows.length} passages (dry run). Sample:\n  ${rows[Math.floor(rows.length / 2)]?.content.slice(0, 300)}…`);
    continue;
  }

  const vectors = [];
  for (let i = 0; i < rows.length; i += BATCH) {
    // The book title travels with each passage so the vector carries its context.
    vectors.push(...(await embed(rows.slice(i, i + BATCH).map((r) => `${doc.title} — ${r.part.label}\n\n${r.content}`))));
    process.stdout.write(`\r  embedded ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  console.log();

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into rag_document (id, title, publisher, year, url, license) values ($1,$2,$3,$4,$5,$6)
       on conflict (id) do update set title = excluded.title, publisher = excluded.publisher, year = excluded.year,
         url = excluded.url, license = excluded.license, ingested_at = now()`,
      [doc.id, doc.title, doc.publisher, doc.year, doc.url, doc.license],
    );
    await client.query("delete from rag_chunk where document_id = $1", [doc.id]);
    for (let i = 0; i < rows.length; i++) {
      const { part, index, content } = rows[i];
      await client.query(
        "insert into rag_chunk (document_id, part_label, part_url, chunk_index, content, embedding) values ($1,$2,$3,$4,$5,$6::vector)",
        [doc.id, part.label, part.url, index, content, JSON.stringify(vectors[i])],
      );
    }
    await client.query("commit");
    console.log(`${doc.id}: stored ${rows.length} passages`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

console.log(`Done: ${total} passages from ${documents.length} documents${DRY_RUN ? " (dry run, nothing stored)" : ""}.`);
await pool?.end();
