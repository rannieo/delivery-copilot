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
| `src/mastra/index.ts` | Mastra entry point. Registers workflow, agents, storage, observability, workspace, CORS, and custom API routes. |
| `src/mastra/agents/` | Specialist Mastra agents. |
| `src/mastra/shared/prompts/` | Role prompts and artifact templates. |
| `src/mastra/workflows/` | `deliveryCopilotWorkflow` and step wrappers. |
| `src/mastra/rag/` | RAG config, document chunking/embedding, vector storage, retrieval rendering. |
| `src/mastra/api/` | Custom Mastra API routes used by the frontend backend surface. |
| `src/mastra/tools/` | Agent tools retained for context retrieval and related workflow support. |
| `src/db/` | Drizzle schema, migrations, and repositories for business data. |
| `database/init/` | Postgres container init scripts, including `pgvector` extension setup. |
| `tests/` | Node test-runner coverage for structured output, RAG helpers, and API route behavior. |

## Requirements

- Node.js `>=22.13.0`
- `pnpm`
- PostgreSQL with `pgvector`
- Model provider key(s), for example `OPENAI_API_KEY`

The local Docker Postgres service uses `postgres:16-alpine` and runs `database/init/001-pgvector.sql` on first database initialization.

## Environment

Copy the sample environment file:

```sh
cp .env.example .env
```

Important settings:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Required for Drizzle and Postgres-backed Mastra storage. |
| `MASTRA_STORAGE_DRIVER` | `postgres` by default. Use `libsql` only for local Mastra state experiments. |
| `WORKSPACE_BASE_PATH` | Local artifact workspace path when `MASTRA_FILESYSTEM_DRIVER=local`. |
| `RAG_ENABLED` | Enables workflow prompt retrieval and project document search. |
| `RAG_VECTOR_INDEX` | PgVector index/table name for document chunks. |
| `RAG_EMBEDDING_MODEL` | Embedding model routed through Mastra model router. |
| `FRONTEND_ORIGIN` | CORS origin for the frontend app. |

## Getting Started

```sh
pnpm install
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

Open [http://localhost:4111](http://localhost:4111) for Mastra Studio.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start Mastra Studio at `localhost:4111`. |
| `pnpm build` | Build a production-ready Mastra server bundle. |
| `pnpm start` | Run the built server. |
| `pnpm db:generate` | Generate a Drizzle migration from `src/db/schema.ts`. |
| `pnpm db:migrate` | Apply pending migrations to `DATABASE_URL`. |
| `pnpm db:studio` | Open Drizzle Studio against `DATABASE_URL`. |

## Frontend API Surface

Custom routes are registered through Mastra and exposed under the server API prefix. With the default prefix, these are:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/projects/:projectId/documents` | List indexed project documents. |
| `POST` | `/api/projects/:projectId/documents` | Ingest and index a project document. |
| `DELETE` | `/api/projects/:projectId/documents/:documentId` | Delete document metadata and remove its vector chunks. |
| `POST` | `/api/projects/:projectId/context/search` | Retrieve source-labeled RAG context for a query. |

Current route auth is intentionally disabled for local/frontend integration. Do not expose these routes to an untrusted origin until real auth is wired.

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

## RAG Flow

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

Focused tests:

```sh
node --experimental-strip-types --test \
  tests/api/project-document-routes.test.ts \
  tests/rag/document-service.test.ts \
  tests/rag/retrieval-service.test.ts \
  tests/rag/workflow-retrieval.test.ts \
  tests/structured-output.test.ts
```

Typecheck and build:

```sh
pnpm exec tsc --noEmit
pnpm build
```

## Notes for Contributors

- Use `pnpm`; do not introduce `package-lock.json`.
- Run `pnpm db:generate` after changing `src/db/schema.ts`.
- Keep agent outputs structured: the role-specific Markdown document belongs in the `markdown` field.
- Keep frontend-facing API route registration thin; put route handlers, schemas, dependency wiring, and HTTP helpers under `src/mastra/api/project-documents/`.
- Before exposing custom API routes outside local/dev use, add authentication and authorization.

## Learn More

- [Mastra documentation](https://mastra.ai/docs/)
- [Mastra Agents](https://mastra.ai/docs/agents/overview)
- [Mastra Workflows](https://mastra.ai/docs/workflows/overview)
- [Mastra RAG](https://mastra.ai/docs/rag/overview)
- [Mastra custom API routes](https://mastra.ai/docs/server/custom-api-routes)
