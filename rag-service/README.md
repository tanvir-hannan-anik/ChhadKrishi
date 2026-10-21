# ChhadKrishi knowledge-base service (Agriculture Encyclopedia RAG)

A FastAPI + LangGraph service that answers agriculture questions **only from the
_Encyclopedia of Agriculture and Food Systems_ (2nd ed., Elsevier 2014)**. Every answer cites the
original PDF pages, and the service abstains or asks a question when the evidence is missing or
conflicting. The Next.js app calls it server-to-server, the same way it calls `ml-service/`.

```
Book/Agriculture.pdf ──► scripts/ingest.py ──► Supabase Postgres + pgvector (kb_document, kb_chunk)
                                                        ▲
Next.js (chat, photo analysis, care, designer) ──► /v1/answer, /v1/diagnose ──► LangGraph pipeline
```

## What it does

**Ingestion** (`scripts/ingest.py`, `app/ingest/`)
- PyMuPDF extraction is built around the book's outline (5 parts, 176 content articles, ~2,800 sections), so
  section boundaries come from the TOC, not guesswork. Two-column reading order is handled, and
  running headers/footers, the copyright line and the "References / See also / Relevant Websites"
  sections are removed. Authors and DOI are kept for each article.
- Tables are extracted as Markdown together with their "Table N" title; large tables are split by rows,
  repeating the header. Figure captions become their own chunks, with diagram text labels attached.
  Pages without a text layer are OCR'd with Tesseract when it is installed. Pages that could not be
  OCR'd are listed in the ingestion report.
- Structure-aware chunks (~1,200 characters, ~220 characters of sentence-aligned overlap) never cross a
  section boundary. Each chunk carries the article › section › subsection path, PDF page range,
  printed page labels (`V1:37`), DOI and deterministic metadata tags (crop, disease/pest, soil, season,
  nutrient) from a bilingual lexicon (`app/ingest/lexicon.py`).
- Multilingual embeddings: `qwen/qwen3-embedding-8b` at 1024 dimensions by default (API), or
  `BAAI/bge-m3` locally. Both handle Bangla questions against English text.
- Batched, idempotent and resumable: chunk ids are content hashes. Re-running skips chunks that are
  already embedded, removes stale ones, and re-embeds everything if the embedding model changed.
  The extraction is cached as JSONL in `data/`.

**Retrieval** (`app/retrieval/`)
- Hybrid search: pgvector HNSW cosine search runs for the question plus 2–4 LLM-rewritten English
  queries, alongside Postgres full-text search (OR of keywords, heading-weighted). The results are
  merged with reciprocal-rank fusion, and chunks whose metadata matches entities named in the
  question get a boost.
- Reranking: an optional cross-encoder (`BAAI/bge-reranker-v2-m3`), otherwise the fused order.
- Context filtering: weak vector-only matches are dropped, as are near-duplicates (overlapping chunks).
  At most 3 chunks come from one section.

**LangGraph pipeline** (`app/graph/pipeline.py`)

```
route_intent ─► [analyze_vision] ─► rewrite_query ─► retrieve ─► verify_evidence ─► detect_conflicts
                                        ▲  (broaden once)            │ too little ─► abstain
                                        └────────────────────────────┘
generate ─► validate_citations ─► finalize        (fails ─► regenerate with feedback ─► repair ─► abstain)
```

| Node | Role | If it fails |
|---|---|---|
| `route_intent` | intent (disease, care, fertilizer, crop, garden, general, smalltalk, out of scope), language, standalone question, clarification needed? | rule-based routing |
| `analyze_vision` | photo → **observations only** (symptoms, parts, visible pests, photo quality); never a diagnosis | abstain ("photo could not be analysed") |
| `rewrite_query` | Bangla/English → English encyclopedia queries + keywords; broadens on retry | lexicon keywords |
| `retrieve` | hybrid search + rerank + context filtering | – |
| `verify_evidence` | LLM grades each passage; the supporting quote must occur **verbatim** in the passage (checked in code) | abstain |
| `detect_conflicts` | contradictory doses/timings/causes, surfaced with both citations | continue without |
| `generate` | task-specific grounded answer (`answer`, `diagnose`, `care_plan`, `garden_plan`) | abstain |
| `validate_citations` | **deterministic** checks: citations exist; facts are cited; every number (dose, rate, temperature, %) appears in the cited passage; disease/plant names are spelled as in the source | regenerate with the failures → strip failing sentences → abstain |

The service never returns uncited facts, numbers that are not in the evidence, or made-up citations.
When the evidence is insufficient it says so, lists the closest sections (marked as "not an answer"),
and asks clarifying questions.

## API

All `/v1` routes need `Authorization: Bearer $RAG_SERVICE_TOKEN`.

| Route | Body | Returns |
|---|---|---|
| `GET /health` | – | config summary (no secrets), KB statistics, cache stats |
| `POST /v1/answer` | `{question, lang?, task?: answer\|care_plan\|garden_plan, history?, context?, observations?, filters?}` | result (below) |
| `POST /v1/diagnose` | multipart: `image`, `note`, `lang`, `measurements`, `context` | result with `observations` and candidate `items` |
| `POST /v1/retrieve` | `{query, keywords?, top_k?, filters?}` | ranked passages with page references |

The result has these fields:

- `status`: `answered | partial | abstained | needs_clarification | not_applicable`
- `answer`: text with `[n]` citations
- `items`: candidate diseases, plants or care practices, each with `citations`
- `citations[]`: `{n, article, heading_path, page_ref: "Vol. 1, p. 37 (PDF p. 66)", pdf_page_start, doi, quote}`
- `conflicts[]`, `clarifying_questions[]`, `uncertainty`
- `related[]`: present when abstaining
- `trace`: intent, queries, timings, attempts

## Setup

```bash
cd rag-service
python -m venv .venv && . .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env                              # or rely on ../.env.local during development
```

Required: `RAG_SERVICE_TOKEN`, `SUPABASE_DB_URL`, an LLM key (`GROQ_API_KEY`, `OPENROUTER_API_KEY` or
`AI_GATEWAY_API_KEY`), and an embedding key (`OPENROUTER_API_KEY` or `AI_GATEWAY_API_KEY`; Groq has
no embeddings). For scanned pages, install Tesseract and set `TESSERACT_CMD`.

### Ingest the book

```bash
python -m scripts.ingest ../Book/Agriculture.pdf --dry-run      # extract + chunk; writes data/*.jsonl and a report
python -m scripts.ingest ../Book/Agriculture.pdf                # embed + store (resumable)
python -m scripts.ingest ../Book/Agriculture.pdf --pages 60-80  # quick trial on a page range
```

Full-book extraction takes about an hour on a laptop CPU, mostly table detection. It is cached, so
embedding retries do not repeat it.

### Deploy on Vercel

Create a separate Vercel project from this repository with **Root Directory = `rag-service`**
(like `ml-service`). `index.py` exposes the FastAPI `app`. Set `RAG_SERVICE_TOKEN`,
`SUPABASE_DB_URL`, `GROQ_API_KEY`, `OPENROUTER_API_KEY` and `RAG_SKIP_ENV_FILES=1` there, then put
the deployment URL and the same token into the main project as `RAG_SERVICE_URL` /
`RAG_SERVICE_TOKEN`. Ingestion is run locally (it writes straight to Supabase), not on Vercel.

### Run

```bash
uvicorn app.main:app --port 8100
# or: docker build -t chhadkrishi-kb . && docker run -p 8100:8000 --env-file .env chhadkrishi-kb
```

Then set these variables in the app's `.env.local`:

```
RAG_SERVICE_URL=http://localhost:8100
RAG_SERVICE_TOKEN=<same token>
CHHADKRISHI_KB_MODE=strict      # or "assist" (see below)
```

### How the app uses it

| Feature | Integration | Strict mode (default) when the book has no evidence |
|---|---|---|
| Chat (`src/lib/ai/chat-service.ts`) | `/v1/answer` (text) or `/v1/diagnose` (photo); the verified answer is written into the chat stream and the page citations appear in the sources list | the chat says the book doesn't cover it and asks clarifying questions. Small talk still goes to the normal assistant |
| Photo analysis (`/api/analyze`) | `/v1/diagnose` runs alongside the vision model; the UI shows an "Encyclopedia" card with cited candidates | the vision model's own treatments and doses are hidden; the card says "not covered" |
| Care suggestions (`/api/care/suggest`) | `task: care_plan` evidence is passed to the routine generator; tasks show their source pages | fertilizer and pest tasks without a cited source are dropped |
| Garden designer plan + image (`/api/designer/plan`) | `task: garden_plan` returns evidence-backed plants and design constraints; the plan may use only those plants plus the gardener's own picks; the signed image prompt is limited to the plan's plant list | only the gardener's chosen plants are used, labelled "not verified" |

`CHHADKRISHI_KB_MODE=assist` lets the general assistant answer when the book has no evidence. That
answer is explicitly labelled as unverified and avoids doses. If `RAG_SERVICE_URL` is unset, or the
service is down, every feature behaves exactly as it did before this service existed.

## Tests and evaluation

```bash
pytest                                          # unit + graph tests (scripted LLM, in-memory KB; no network)
python eval/build_questions.py                  # writes eval/questions.jsonl
python -m scripts.verify_eval_set ../Book/Agriculture.pdf   # checks every gold quote on its PDF page
python -m scripts.evaluate retrieval            # page_hit@k, quote_hit@6, MRR
python -m scripts.evaluate answer               # grounded accuracy, citation correctness, abstention
python -m scripts.evaluate vision               # needs labelled photos in eval/vision/ (see eval/README.md)
```

Every metric is reported with its sample size and a 95% Wilson interval. With about 50 items, a
measured 96% has an interval of roughly 87–99%. Treat the numbers as measurements of this dataset,
not as guarantees.

## Notes and limits

- **Licensing:** the encyclopedia is © Elsevier. The service stores its text in your private
  database for retrieval, and answers show short quotes with page references. Check that your
  licence covers this use before deploying publicly. The PDF and `data/` are git-ignored.
- **Coverage:** the book is a scholarly reference on agriculture and food systems, not a
  rooftop-gardening manual. Many practical questions (specific container doses, local products,
  Bangladeshi prices) are outside its coverage, and strict mode will say so rather than guess.
- **Vision:** photo diagnosis is only as good as the observations and the book's symptom
  descriptions. The vision node never names a disease itself; candidates must be named in the
  cited evidence.
