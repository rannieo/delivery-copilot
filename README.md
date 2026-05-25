# Delivery Copilot

Delivery Copilot is a multi-agent [Mastra](https://mastra.ai/) backend that turns a product brief or PRD into an implementation-ready technical delivery plan. It runs a structured workflow of specialist agents, persists every artifact, and exposes project-document RAG APIs for a frontend app.

## What It Produces

Given a project name and raw input, the workflow returns:

- specialist Markdown artifacts with `summary`, `assumptions`, `risks`, and `openQuestions`
- a final consolidated Markdown technical delivery plan
- persisted project, workflow run, agent artifact, final plan, and RAG document metadata

## Workflow

Input schema:

```ts
{
  projectName: string;
  projectDescription?: string;
  rawInput: string;
  planTitle?: string;
  useRag?: boolean; // defaults to true
}
```

Pipeline:

```text
initialize
  -> Product Analyst
  -> Solution Architect
  -> Security Manager
  -> UX Lead
  -> Backend Lead
  -> Frontend Lead
  -> Mobile Lead
  -> Platform Lead / SRE
  -> QA Engineer
  -> Delivery Manager
  -> Final Plan Aggregator
```

Each specialist agent produces a structured response. The Markdown artifact lives in the `markdown` field; downstream agents consume compact summaries, risks, open questions, and retrieved project context.

## Project Structure

| Path | Purpose |
| --- | --- |
| `backend/src/mastra/index.ts` | Mastra entry point. Registers workflow, agents, storage, observability, workspace, CORS, and custom API routes. |
| `backend/src/mastra/agents/` | Specialist Mastra agents. |
| `backend/src/mastra/shared/prompts/` | Role prompts and artifact templates. |
| `backend/src/mastra/workflows/` | `deliveryCopilotWorkflow` and step wrappers. |
| `backend/src/mastra/rag/` | RAG config, document chunking/embedding, vector storage, retrieval rendering. |
| `backend/src/mastra/api/` | Custom Mastra API routes used by the frontend backend surface. |
| `backend/src/mastra/tools/` | Agent tools retained for context retrieval and related workflow support. |
| `backend/src/db/` | Drizzle schema, migrations, and repositories for business data. |
| `backend/database/init/` | Postgres container init scripts, including `pgvector` extension setup. |
| `frontend/` | Demo Next.js App Router frontend with shadcn/ui and server-side Mastra API proxies. |
| `backend/tests/` | Node test-runner coverage for structured output, RAG helpers, and API route behavior. |
| `docs/` | Project plans and supporting documentation. |
| `Makefile` | Root development shortcuts for install, dev servers, tests, typechecks, and builds. |

## Requirements

- Node.js `>=22.13.0`
- `pnpm`
- PostgreSQL with `pgvector`
- Model provider key(s) for the configured models. The default agent model uses `OLLAMA_API_KEY`.

The local Docker Postgres service uses `pgvector/pgvector:0.8.2-pg16-trixie` and runs `backend/database/init/001-pgvector.sql` on first database initialization. If you already created the local database with the plain `postgres:16-alpine` image, recreate the container after pulling the new image, then run `CREATE EXTENSION IF NOT EXISTS vector;` in the existing database or reinitialize the volume.

## Environment

Copy the sample environment files:

```sh
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Keep `PROJECT_DOCUMENT_API_TOKEN` in `frontend/.env.local` matched to `backend/.env`; the Next.js route handlers proxy requests to Mastra without exposing the shared secret in browser code.

Important settings:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Required for Drizzle and Postgres-backed Mastra storage. |
| `PROJECT_DOCUMENT_API_TOKEN` | Shared secret required by the custom project-document API routes. Send it as `x-delivery-copilot-token`. |
| `AGENT_MODEL` | Agent model routed through Mastra model router. Defaults to `ollama-cloud/gpt-oss:120b`. |
| `OLLAMA_API_KEY` | Required when `AGENT_MODEL` uses `ollama-cloud/*`. |
| `OPENAI_API_KEY` | Required when `AGENT_MODEL` or `RAG_EMBEDDING_MODEL` uses `openai/*`. |
| `MASTRA_STORAGE_DRIVER` | `postgres` by default. Use `libsql` only for local Mastra state experiments. |
| `WORKSPACE_BASE_PATH` | Local artifact workspace path when `MASTRA_FILESYSTEM_DRIVER=local`. |
| `RAG_ENABLED` | Enables workflow prompt retrieval and project document search. Defaults off unless `RAG_EMBEDDING_MODEL` is set. |
| `RAG_VECTOR_INDEX` | PgVector index/table name for document chunks. |
| `RAG_EMBEDDING_DRIVER` | Embedding adapter. Use `mastra` by default or `langchain-openai` for LangChain OpenAI embeddings. |
| `RAG_EMBEDDING_MODEL` | Embedding model routed through Mastra model router or an OpenAI-compatible endpoint. |
| `RAG_EMBEDDING_BASE_URL` | Optional OpenAI-compatible embedding base URL, for example local Ollama at `http://localhost:11434/v1`. |
| `RAG_EMBEDDING_API_KEY` | Optional key for custom OpenAI-compatible embedding endpoints. |
| `FRONTEND_ORIGIN` | CORS origin for the frontend app. |

## Getting Started

```sh
make install
docker compose up -d postgres
pnpm --dir backend db:migrate
make dev
```

Open [http://localhost:4111](http://localhost:4111) for Mastra Studio and [http://localhost:3000](http://localhost:3000) for the frontend.

## Scripts

| Command | What it does |
| --- | --- |
| `make install` | Install backend and frontend dependencies. |
| `make dev` | Start both dev servers: Mastra Studio at `localhost:4111` and the frontend at `localhost:3000`. |
| `make dev-test` | Run local dev verification: Docker Compose config, backend tests, backend typecheck, and frontend typecheck. |
| `make build` | Build backend and frontend. |
| `make dev-backend` | Start Mastra Studio from the repo root. |
| `make dev-frontend` | Start the frontend from the repo root. |
| `pnpm --dir backend dev` | Start Mastra Studio at `localhost:4111`. |
| `pnpm --dir backend build` | Build a production-ready Mastra server bundle. |
| `pnpm --dir backend start` | Run the built server. |
| `pnpm --dir backend test` | Run backend tests. |
| `pnpm --dir backend db:generate` | Generate a Drizzle migration from `backend/src/db/schema.ts`. |
| `pnpm --dir backend db:migrate` | Apply pending migrations to `DATABASE_URL`. |
| `pnpm --dir backend db:studio` | Open Drizzle Studio against `DATABASE_URL`. |
| `pnpm --dir frontend dev` | Start the demo Next.js app at `localhost:3000`. |
| `pnpm --dir frontend build` | Build the demo frontend. |

## Frontend API Surface

Custom routes are registered through Mastra at these backend paths:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/demo/workflow/run` | Run `deliveryCopilotWorkflow` from the demo frontend. |
| `GET` | `/projects/:projectId/documents` | List indexed project documents. |
| `POST` | `/projects/:projectId/documents` | Ingest and index a project document. |
| `DELETE` | `/projects/:projectId/documents/:documentId` | Delete document metadata and remove its vector chunks. |
| `POST` | `/projects/:projectId/context/search` | Retrieve source-labeled RAG context for a query. |

The Next.js demo keeps browser-facing routes under `/api/*` and proxies them server-side to these Mastra paths.

All custom demo routes require the `x-delivery-copilot-token` header to match `PROJECT_DOCUMENT_API_TOKEN`. If the server token is missing, these routes fail closed with `503`.

Example workflow payload:

```json
{
  "projectName": "QueueLite",
  "projectDescription": "Queue management for small restaurants.",
  "rawInput": "# QueueLite\nCustomers scan QR codes to join the queue.",
  "planTitle": "QueueLite delivery plan",
  "useRag": false
}
```

Example document ingestion payload:

```json
{
  "sourceName": "QueueLite PRD",
  "sourceType": "prd",
  "content": "# QueueLite\nCustomers scan a QR code to join the queue."
}
```

Allowed `sourceType` values are `prd`, `meeting_notes`, `technical_notes`, and `other`.

Example context search payload:

```json
{
  "query": "QR code queue join and staff queue controls",
  "topK": 6,
  "minScore": 0.55
}
```

Example request header:

```http
x-delivery-copilot-token: change-me-in-production
```

## RAG Flow

RAG is disabled by default. Local Ollama is not required; the backend already embeds chunks through Mastra's model router and the AI SDK. For hosted OpenAI embeddings, set:

```sh
OPENAI_API_KEY=your-openai-api-key
RAG_ENABLED=true
RAG_VECTOR_INDEX=project_document_vectors
RAG_EMBEDDING_DRIVER=langchain-openai
RAG_EMBEDDING_MODEL=openai/text-embedding-3-small
RAG_EMBEDDING_DIMENSION=1536
```

For the default Mastra embedding driver with a local or custom OpenAI-compatible embedding endpoint, set the provider/model plus the endpoint URL:

```sh
RAG_ENABLED=true
RAG_VECTOR_INDEX=project_document_vectors
RAG_EMBEDDING_DRIVER=mastra
RAG_EMBEDDING_MODEL=ollama/nomic-embed-text
RAG_EMBEDDING_BASE_URL=http://localhost:11434/v1
RAG_EMBEDDING_DIMENSION=768
```

Document ingestion:

1. Save document metadata in `project_documents`.
2. Chunk Markdown with `MDocument`.
3. Embed chunks with `ModelRouterEmbeddingModel` and AI SDK `embedMany`.
4. Upsert vectors and source metadata into `PgVector`.
5. Save chunk metadata in `project_document_chunks`.

Workflow retrieval:

1. Build a query from the current agent role, raw input, and previous artifact summaries.
2. Embed the query.
3. Query `PgVector` filtered by `projectId`.
4. Render source-labeled context into the agent prompt.
5. If retrieval fails, the workflow continues with an explicit retrieval warning instead of failing the whole run.

## Storage and Observability

- Mastra storage defaults to `PostgresStore`, sharing `DATABASE_URL`.
- Drizzle repositories use the same Postgres database for project metadata, workflow runs, artifacts, final plans, and document metadata.
- `MastraCompositeStore` routes the observability domain to `DuckDBStore`.
- `MastraStorageExporter` stores traces locally; `MastraPlatformExporter` can ship traces to Mastra Platform when configured.
- `SensitiveDataFilter` is enabled for observability export.

## Verification

Run the standard local verification from the repo root:

```sh
make dev-test
```

Focused tests:

```sh
cd backend
node --experimental-strip-types --test \
  tests/api/project-document-routes.test.ts \
  tests/rag/document-service.test.ts \
  tests/rag/retrieval-service.test.ts \
  tests/rag/workflow-retrieval.test.ts \
  tests/structured-output.test.ts
```

Typecheck and build:

```sh
pnpm --dir backend exec tsc --noEmit
make build
```

## Notes for Contributors

- Use `pnpm`; do not introduce `package-lock.json`.
- Run `pnpm --dir backend db:generate` after changing `backend/src/db/schema.ts`.
- Keep agent outputs structured: the role-specific Markdown document belongs in the `markdown` field.
- Keep frontend-facing API route registration thin; put route handlers, schemas, dependency wiring, and HTTP helpers under `backend/src/mastra/api/project-documents/`.
- Before exposing custom API routes outside local/dev use, add authentication and authorization.

## Learn More

- [Mastra documentation](https://mastra.ai/docs/)
- [Mastra Agents](https://mastra.ai/docs/agents/overview)
- [Mastra Workflows](https://mastra.ai/docs/workflows/overview)
- [Mastra RAG](https://mastra.ai/docs/rag/overview)
- [Mastra custom API routes](https://mastra.ai/docs/server/custom-api-routes)
