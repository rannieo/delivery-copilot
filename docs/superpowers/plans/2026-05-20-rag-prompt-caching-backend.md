# RAG and Prompt Caching Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production-shaped RAG layer and repeat-call caching strategy so the Mastra backend can serve a frontend with document ingestion, retrieval preview, and delivery-plan generation.

**Architecture:** Use Postgres as the business data store and PgVector as the vector store, with Mastra custom API routes as the frontend-facing contract. Retrieval is performed by backend services before each workflow agent call, then injected into the workflow prompt as bounded context. Prompt cost is controlled with Mastra `ResponseCache`, stable prompt layout, deterministic retrieval inputs, and an application-level final-plan cache.

**Tech Stack:** Mastra `1.35.x`, TypeScript, Drizzle, PostgreSQL with `pgvector`, `@mastra/pg`, `@mastra/rag`, `ai`, `ModelRouterEmbeddingModel`, Mastra custom API routes, Mastra `ResponseCache`.

---

## Current State

- The workflow runs a fixed chain of specialist agents and persists artifacts in Postgres plus the Mastra workspace filesystem.
- There is no `@mastra/rag` dependency installed yet.
- `@mastra/pg` is already installed and supports both `PostgresStore` and `PgVector`.
- Mastra custom API routes are the right boundary for frontend-specific endpoints.
- Mastra `ResponseCache` is available and must be registered on each agent through `inputProcessors`; provider prompt caching is not a Mastra-level universal API.

## Backend Contract

The frontend should not call agent internals directly for RAG. It should call app routes with stable JSON contracts:

- `POST /api/projects/:projectId/documents` ingests or replaces one source document.
- `GET /api/projects/:projectId/documents` lists uploaded document metadata and indexing status.
- `POST /api/projects/:projectId/context/search` previews retrieved context for a query.
- `POST /api/delivery-plans` starts the workflow with `projectName`, `projectDescription`, `rawInput`, `planTitle`, and optional `useRag`, `cacheMode`.
- `GET /api/delivery-plans/:workflowRunId` returns workflow status, artifacts, final plan, and cache metadata.

## File Structure

- Create `src/mastra/rag/config.ts`: RAG environment config, embedding model name, index name, chunking settings.
- Create `src/mastra/rag/vector-store.ts`: PgVector singleton and index initialization.
- Create `src/mastra/rag/document-service.ts`: document ingestion, chunking, embedding, vector upsert.
- Create `src/mastra/rag/retrieval-service.ts`: query embedding, vector search, metadata filtering, prompt context rendering.
- Create `src/mastra/cache.ts`: shared Mastra server cache and response-cache processor factory.
- Create `src/mastra/api/project-documents-routes.ts`: document ingestion/list/search custom routes.
- Create `src/mastra/api/delivery-plan-routes.ts`: frontend workflow start/status routes.
- Modify `src/mastra/index.ts`: register vectors, custom API routes, cache, and route build options.
- Modify `src/mastra/helpers/index.ts`: include retrieved context in `buildAgentPrompt`.
- Modify `src/mastra/workflows/steps/_make-delivery-step.ts`: retrieve role-specific context before each agent call and pass response-cache request context.
- Modify `src/mastra/shared/schema/delivery-schema.ts`: add `useRag`, `cacheMode`, `retrievedContext`, and cache metadata.
- Modify `src/db/schema.ts`: add document, chunk, retrieval event, and plan cache tables.
- Create `tests/rag/*.test.ts`: unit tests for chunk metadata, retrieval filtering, prompt rendering, cache keys.
- Modify `.env.example`: add embedding, RAG, cache, and frontend CORS variables.
- Modify `docker-compose.yml`: ensure Postgres initializes `pgvector`.
- Create a Drizzle migration after schema changes with `pnpm db:generate`.

---

### Task 1: Install RAG Dependencies and Configure Environment

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `docker-compose.yml`
- Create: `database/init/001-pgvector.sql`

- [ ] **Step 1: Add direct dependencies**

Run:

```bash
pnpm add @mastra/rag ai
```

Expected: `package.json` contains direct dependencies for `@mastra/rag` and `ai`.

- [ ] **Step 2: Add pgvector init SQL**

Create `database/init/001-pgvector.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

- [ ] **Step 3: Fix the Docker init mount**

Change `docker-compose.yml` volume mount from:

```yaml
- ./database/migrations:/docker-entrypoint-initdb.d:ro
```

to:

```yaml
- ./database/init:/docker-entrypoint-initdb.d:ro
```

- [ ] **Step 4: Add environment variables**

Append to `.env.example`:

```dotenv
# RAG
RAG_ENABLED=true
RAG_VECTOR_INDEX=project_documents
RAG_EMBEDDING_MODEL=openai/text-embedding-3-small
RAG_EMBEDDING_DIMENSION=1536
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=120
RAG_TOP_K=6
RAG_MIN_SCORE=0.55

# Response caching
RESPONSE_CACHE_ENABLED=true
RESPONSE_CACHE_TTL_SECONDS=1800

# Frontend backend contract
FRONTEND_ORIGIN=http://localhost:3000
```

- [ ] **Step 5: Verify install and config**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: command exits `0`.

---

### Task 2: Add Database Schema for Documents and Cache Metadata

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/db/repositories/project-document-repository.ts`
- Create: `src/db/repositories/plan-cache-repository.ts`
- Create: generated migration under `src/db/migrations/`

- [ ] **Step 1: Write repository-facing types first**

Create `src/db/repositories/project-document-repository.ts` with function signatures only:

```ts
import { eq } from "drizzle-orm";
import { getDb } from "../client";
import { projectDocumentChunks, projectDocuments } from "../schema";

export type ProjectDocumentRow = typeof projectDocuments.$inferSelect;
export type ProjectDocumentChunkRow = typeof projectDocumentChunks.$inferSelect;

export async function listProjectDocuments(projectId: string): Promise<ProjectDocumentRow[]> {
  return getDb().select().from(projectDocuments).where(eq(projectDocuments.projectId, projectId));
}
```

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: fail because `projectDocuments` and `projectDocumentChunks` do not exist yet.

- [ ] **Step 2: Add document tables**

Add to `src/db/schema.ts`:

```ts
export const projectDocuments = pgTable(
  "project_documents",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    sourceName: text("source_name").notNull(),
    sourceType: text("source_type", { enum: ["prd", "meeting_notes", "technical_notes", "architecture", "other"] })
      .notNull()
      .default("other"),
    contentHash: text("content_hash").notNull(),
    status: text("status", { enum: ["pending", "indexed", "failed"] }).notNull().default("pending"),
    chunkCount: integer("chunk_count").notNull().default(0),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_project_documents_project_id").on(t.projectId),
    index("idx_project_documents_content_hash").on(t.contentHash),
  ],
);

export const projectDocumentChunks = pgTable(
  "project_document_chunks",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => projectDocuments.id, { onDelete: "cascade" }),
    vectorId: text("vector_id").notNull().unique(),
    chunkIndex: integer("chunk_index").notNull(),
    text: text("text").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_project_document_chunks_project_id").on(t.projectId),
    index("idx_project_document_chunks_document_id").on(t.documentId),
  ],
);
```

- [ ] **Step 3: Add final-plan cache metadata**

Add to `src/db/schema.ts`:

```ts
export const planCacheEntries = pgTable(
  "plan_cache_entries",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    cacheKey: text("cache_key").notNull().unique(),
    workflowRunId: uuid("workflow_run_id").references(() => workflowRuns.id, { onDelete: "set null" }),
    finalPlanId: uuid("final_plan_id").references(() => finalPlans.id, { onDelete: "set null" }),
    modelId: text("model_id").notNull(),
    retrievalConfig: jsonb("retrieval_config").$type<Record<string, unknown>>().notNull().default({}),
    documentHashes: jsonb("document_hashes").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_plan_cache_entries_project_id").on(t.projectId),
    index("idx_plan_cache_entries_cache_key").on(t.cacheKey),
  ],
);
```

- [ ] **Step 4: Complete repositories**

Extend `project-document-repository.ts` with:

```ts
import { and, eq } from "drizzle-orm";

export async function findProjectDocumentByHash(input: {
  projectId: string;
  contentHash: string;
}): Promise<ProjectDocumentRow | null> {
  const [row] = await getDb()
    .select()
    .from(projectDocuments)
    .where(and(eq(projectDocuments.projectId, input.projectId), eq(projectDocuments.contentHash, input.contentHash)));
  return row ?? null;
}

export async function saveProjectDocument(input: {
  projectId: string;
  sourceName: string;
  sourceType: ProjectDocumentRow["sourceType"];
  contentHash: string;
}): Promise<ProjectDocumentRow> {
  const [row] = await getDb()
    .insert(projectDocuments)
    .values(input)
    .returning();
  if (!row) throw new Error("Failed to save project document");
  return row;
}
```

Create `src/db/repositories/plan-cache-repository.ts` with read/write helpers for `cacheKey`.

- [ ] **Step 5: Generate and run migration**

Run:

```bash
pnpm db:generate
pnpm exec tsc --noEmit
```

Expected: Drizzle generates a migration and TypeScript exits `0`.

---

### Task 3: Implement RAG Config, Vector Store, and Ingestion

**Files:**
- Create: `src/mastra/rag/config.ts`
- Create: `src/mastra/rag/vector-store.ts`
- Create: `src/mastra/rag/document-service.ts`
- Create: `tests/rag/document-service.test.ts`

- [ ] **Step 1: Write the chunk metadata test**

Create `tests/rag/document-service.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildChunkMetadata } from "../../src/mastra/rag/document-service.ts";

test("buildChunkMetadata creates stable frontend-safe metadata", () => {
  const metadata = buildChunkMetadata({
    projectId: "project-1",
    documentId: "doc-1",
    sourceName: "QueueLite PRD",
    sourceType: "prd",
    chunkIndex: 2,
    text: "Admin can create counters.",
  });

  assert.equal(metadata.projectId, "project-1");
  assert.equal(metadata.documentId, "doc-1");
  assert.equal(metadata.sourceName, "QueueLite PRD");
  assert.equal(metadata.sourceType, "prd");
  assert.equal(metadata.chunkIndex, 2);
  assert.equal(typeof metadata.textHash, "string");
  assert.equal(metadata.textHash.length, 64);
});
```

Run:

```bash
node --experimental-strip-types --test tests/rag/document-service.test.ts
```

Expected: fail because `document-service.ts` does not exist.

- [ ] **Step 2: Add RAG config**

Create `src/mastra/rag/config.ts`:

```ts
export const ragConfig = {
  enabled: process.env.RAG_ENABLED !== "false",
  indexName: process.env.RAG_VECTOR_INDEX ?? "project_documents",
  embeddingModel: process.env.RAG_EMBEDDING_MODEL ?? "openai/text-embedding-3-small",
  embeddingDimension: Number(process.env.RAG_EMBEDDING_DIMENSION ?? 1536),
  chunkSize: Number(process.env.RAG_CHUNK_SIZE ?? 800),
  chunkOverlap: Number(process.env.RAG_CHUNK_OVERLAP ?? 120),
  topK: Number(process.env.RAG_TOP_K ?? 6),
  minScore: Number(process.env.RAG_MIN_SCORE ?? 0.55),
};
```

- [ ] **Step 3: Add PgVector singleton**

Create `src/mastra/rag/vector-store.ts`:

```ts
import { PgVector } from "@mastra/pg";
import { ragConfig } from "./config";

let pgVector: PgVector | undefined;

export function getProjectVectorStore(): PgVector {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for RAG vector storage");
  }

  pgVector ??= new PgVector({
    id: "project-documents-vector",
    connectionString: process.env.DATABASE_URL,
  });

  return pgVector;
}

export async function ensureProjectVectorIndex(): Promise<void> {
  await getProjectVectorStore().createIndex({
    indexName: ragConfig.indexName,
    dimension: ragConfig.embeddingDimension,
    metric: "cosine",
    indexConfig: { type: "hnsw" },
  });
}
```

- [ ] **Step 4: Add ingestion helpers**

Create `src/mastra/rag/document-service.ts`:

```ts
import { createHash } from "node:crypto";
import { embedMany } from "ai";
import { ModelRouterEmbeddingModel } from "@mastra/core/llm";
import { MDocument } from "@mastra/rag";
import { ragConfig } from "./config";
import { ensureProjectVectorIndex, getProjectVectorStore } from "./vector-store";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function buildChunkMetadata(input: {
  projectId: string;
  documentId: string;
  sourceName: string;
  sourceType: string;
  chunkIndex: number;
  text: string;
}) {
  return {
    projectId: input.projectId,
    documentId: input.documentId,
    sourceName: input.sourceName,
    sourceType: input.sourceType,
    chunkIndex: input.chunkIndex,
    textHash: sha256(input.text),
    text: input.text,
  };
}

export async function chunkDocumentText(content: string) {
  const doc = MDocument.fromMarkdown(content);
  return doc.chunk({
    strategy: "markdown",
    size: ragConfig.chunkSize,
    overlap: ragConfig.chunkOverlap,
    headers: [
      ["#", "title"],
      ["##", "section"],
    ],
  });
}
```

- [ ] **Step 5: Add full ingest function**

Extend `document-service.ts`:

```ts
export async function ingestProjectDocument(input: {
  projectId: string;
  documentId: string;
  sourceName: string;
  sourceType: string;
  content: string;
}) {
  await ensureProjectVectorIndex();
  const chunks = await chunkDocumentText(input.content);
  const values = chunks.map((chunk) => chunk.text);
  const { embeddings } = await embedMany({
    model: new ModelRouterEmbeddingModel(ragConfig.embeddingModel),
    values,
  });

  const ids = chunks.map((chunk, index) => `${input.documentId}:${index}:${sha256(chunk.text).slice(0, 16)}`);
  const metadata = chunks.map((chunk, index) =>
    buildChunkMetadata({
      projectId: input.projectId,
      documentId: input.documentId,
      sourceName: input.sourceName,
      sourceType: input.sourceType,
      chunkIndex: index,
      text: chunk.text,
    }),
  );

  await getProjectVectorStore().upsert({
    indexName: ragConfig.indexName,
    ids,
    vectors: embeddings,
    metadata,
  });

  return { chunkCount: chunks.length, vectorIds: ids };
}
```

- [ ] **Step 6: Run unit and type checks**

Run:

```bash
node --experimental-strip-types --test tests/rag/document-service.test.ts
pnpm exec tsc --noEmit
```

Expected: both commands exit `0`.

---

### Task 4: Implement Retrieval and Prompt Context Rendering

**Files:**
- Create: `src/mastra/rag/retrieval-service.ts`
- Create: `tests/rag/retrieval-service.test.ts`
- Modify: `src/mastra/helpers/index.ts`
- Modify: `src/mastra/shared/schema/delivery-schema.ts`

- [ ] **Step 1: Write prompt context rendering test**

Create `tests/rag/retrieval-service.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderRetrievedContext } from "../../src/mastra/rag/retrieval-service.ts";

test("renderRetrievedContext returns bounded source-labeled context", () => {
  const rendered = renderRetrievedContext([
    {
      text: "Customers scan QR codes to join the queue.",
      sourceName: "QueueLite PRD",
      sourceType: "prd",
      score: 0.89,
    },
  ]);

  assert.match(rendered, /Retrieved Project Context/);
  assert.match(rendered, /QueueLite PRD/);
  assert.match(rendered, /Customers scan QR codes/);
});
```

Run:

```bash
node --experimental-strip-types --test tests/rag/retrieval-service.test.ts
```

Expected: fail because `retrieval-service.ts` does not exist.

- [ ] **Step 2: Add retrieval result types and renderer**

Create `src/mastra/rag/retrieval-service.ts`:

```ts
import { embed } from "ai";
import { ModelRouterEmbeddingModel } from "@mastra/core/llm";
import { ragConfig } from "./config";
import { getProjectVectorStore } from "./vector-store";

export type RetrievedContextChunk = {
  text: string;
  sourceName: string;
  sourceType: string;
  score: number;
};

export function renderRetrievedContext(chunks: RetrievedContextChunk[]): string {
  if (chunks.length === 0) {
    return "No retrieved project context.";
  }

  return [
    "## Retrieved Project Context",
    ...chunks.map((chunk, index) =>
      [
        `### Source ${index + 1}: ${chunk.sourceName}`,
        `- Type: ${chunk.sourceType}`,
        `- Similarity: ${chunk.score.toFixed(3)}`,
        "",
        chunk.text,
      ].join("\n"),
    ),
  ].join("\n\n");
}
```

- [ ] **Step 3: Add vector retrieval**

Extend `retrieval-service.ts`:

```ts
export async function retrieveProjectContext(input: {
  projectId: string;
  query: string;
  topK?: number;
}): Promise<RetrievedContextChunk[]> {
  if (!ragConfig.enabled) {
    return [];
  }

  const { embedding } = await embed({
    model: new ModelRouterEmbeddingModel(ragConfig.embeddingModel),
    value: input.query,
  });

  const results = await getProjectVectorStore().query({
    indexName: ragConfig.indexName,
    queryVector: embedding,
    topK: input.topK ?? ragConfig.topK,
    filter: { projectId: input.projectId },
    minScore: ragConfig.minScore,
  });

  return results.map((result) => ({
    text: String(result.metadata?.text ?? result.document ?? ""),
    sourceName: String(result.metadata?.sourceName ?? "Unknown source"),
    sourceType: String(result.metadata?.sourceType ?? "other"),
    score: result.score,
  })).filter((chunk) => chunk.text.length > 0);
}
```

- [ ] **Step 4: Extend workflow context schema**

Add to `src/mastra/shared/schema/delivery-schema.ts`:

```ts
export const RetrievedContextChunkSchema = z.object({
  text: z.string(),
  sourceName: z.string(),
  sourceType: z.string(),
  score: z.number(),
});
```

Then add optional fields to workflow input/context schemas:

```ts
useRag: z.boolean().default(true),
cacheMode: z.enum(["use", "refresh", "bypass"]).default("use"),
retrievedContext: z.array(RetrievedContextChunkSchema).default([]),
```

- [ ] **Step 5: Inject retrieved context into prompts**

Modify `buildAgentPrompt` in `src/mastra/helpers/index.ts` to accept:

```ts
retrievedContext?: string;
```

Add this section after previous artifacts:

```ts
Retrieved Context:
${params.retrievedContext ?? "No retrieved project context."}
```

- [ ] **Step 6: Run tests**

Run:

```bash
node --experimental-strip-types --test tests/rag/retrieval-service.test.ts
pnpm exec tsc --noEmit
```

Expected: both commands exit `0`.

---

### Task 5: Wire Retrieval Into Agent Workflow Steps

**Files:**
- Modify: `src/mastra/workflows/steps/_make-delivery-step.ts`
- Modify: `src/mastra/workflows/steps/final-aggregator-step.ts`
- Create: `tests/rag/workflow-retrieval.test.ts`

- [ ] **Step 1: Add role query builder test**

Create `tests/rag/workflow-retrieval.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAgentRetrievalQuery } from "../../src/mastra/workflows/steps/_make-delivery-step.ts";

test("buildAgentRetrievalQuery includes role and project input", () => {
  const query = buildAgentRetrievalQuery({
    role: "Backend Lead Agent",
    rawInput: "Build QueueLite with QR queue join and staff queue controls.",
  });

  assert.match(query, /Backend Lead Agent/);
  assert.match(query, /QueueLite/);
  assert.match(query, /QR queue join/);
});
```

Run:

```bash
node --experimental-strip-types --test tests/rag/workflow-retrieval.test.ts
```

Expected: fail because `buildAgentRetrievalQuery` does not exist.

- [ ] **Step 2: Add role query helper**

Export from `_make-delivery-step.ts`:

```ts
export function buildAgentRetrievalQuery(input: {
  role: string;
  rawInput: string;
}): string {
  return [
    `Role: ${input.role}`,
    "Find project documents, constraints, decisions, risks, API notes, architecture notes, and requirements relevant to this role.",
    input.rawInput.slice(0, 4000),
  ].join("\n\n");
}
```

- [ ] **Step 3: Retrieve context before `agent.generate`**

Inside `execute` in `_make-delivery-step.ts`, before `agent.generate`:

```ts
const retrievedChunks = inputData.useRag
  ? await retrieveProjectContext({
      projectId: inputData.projectId,
      query: buildAgentRetrievalQuery({ role: opts.role, rawInput: inputData.rawInput }),
    })
  : [];

const retrievedContext = renderRetrievedContext(retrievedChunks);
```

Pass `retrievedContext` to `buildAgentPrompt`.

- [ ] **Step 4: Add final aggregator retrieval**

In `final-aggregator-step.ts`, retrieve with:

```ts
const retrievedChunks = inputData.useRag
  ? await retrieveProjectContext({
      projectId: inputData.projectId,
      query: `Final technical delivery plan context:\n\n${inputData.rawInput.slice(0, 4000)}`,
      topK: 10,
    })
  : [];
```

Pass rendered context to `buildAgentPrompt`.

- [ ] **Step 5: Run tests**

Run:

```bash
node --experimental-strip-types --test tests/rag/workflow-retrieval.test.ts
pnpm exec tsc --noEmit
```

Expected: both commands exit `0`.

---

### Task 6: Add Response Cache and Stable Prompt-Caching Shape

**Files:**
- Create: `src/mastra/cache.ts`
- Modify: all files in `src/mastra/agents/*.ts`
- Modify: `src/mastra/workflows/steps/_make-delivery-step.ts`
- Modify: `src/mastra/workflows/steps/final-aggregator-step.ts`
- Create: `tests/cache/response-cache-config.test.ts`

- [ ] **Step 1: Add cache configuration test**

Create `tests/cache/response-cache-config.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { getResponseCacheTtlSeconds } from "../../src/mastra/cache.ts";

test("getResponseCacheTtlSeconds uses a positive default", () => {
  assert.equal(getResponseCacheTtlSeconds({ RESPONSE_CACHE_TTL_SECONDS: undefined }), 1800);
});

test("getResponseCacheTtlSeconds accepts valid env override", () => {
  assert.equal(getResponseCacheTtlSeconds({ RESPONSE_CACHE_TTL_SECONDS: "60" }), 60);
});
```

Run:

```bash
node --experimental-strip-types --test tests/cache/response-cache-config.test.ts
```

Expected: fail because `cache.ts` does not exist.

- [ ] **Step 2: Add shared response cache**

Create `src/mastra/cache.ts`:

```ts
import { InMemoryServerCache } from "@mastra/core/cache";
import { ResponseCache } from "@mastra/core/processors";

export const serverResponseCache = new InMemoryServerCache();

export function getResponseCacheTtlSeconds(env: Pick<NodeJS.ProcessEnv, "RESPONSE_CACHE_TTL_SECONDS"> = process.env): number {
  const value = Number(env.RESPONSE_CACHE_TTL_SECONDS ?? 1800);
  return Number.isFinite(value) && value > 0 ? value : 1800;
}

export function createAgentResponseCache(agentId: string) {
  return new ResponseCache({
    cache: serverResponseCache,
    ttl: getResponseCacheTtlSeconds(),
    agentId,
  });
}
```

- [ ] **Step 3: Register input processors on agents**

For each `src/mastra/agents/*.ts`, add:

```ts
import { createAgentResponseCache } from "../cache";
```

Then add to the `new Agent({ ... })` config:

```ts
inputProcessors: [createAgentResponseCache("product-analyst-agent")],
```

Use the real agent ID in each file.

- [ ] **Step 4: Scope cache per project and cache mode**

In `_make-delivery-step.ts`, import:

```ts
import { ResponseCache } from "@mastra/core/processors";
```

Add to `agent.generate` options:

```ts
requestContext: ResponseCache.context({
  scope: inputData.projectId,
  bust: inputData.cacheMode === "refresh",
}),
```

For `cacheMode === "bypass"`, skip cache by passing a unique key:

```ts
key: inputData.cacheMode === "bypass" ? `${inputData.workflowRunId}:${opts.agentId}` : undefined,
```

- [ ] **Step 5: Preserve provider prompt-cache friendliness**

Keep static material in agent `instructions` and keep volatile material in the user prompt built by `buildAgentPrompt`. Do not inline retrieved chunks into agent instructions. Do not reorder prompt sections between calls.

- [ ] **Step 6: Run tests**

Run:

```bash
node --experimental-strip-types --test tests/cache/response-cache-config.test.ts
pnpm exec tsc --noEmit
```

Expected: both commands exit `0`.

---

### Task 7: Add Frontend-Facing API Routes

**Files:**
- Create: `src/mastra/api/project-documents-routes.ts`
- Create: `src/mastra/api/delivery-plan-routes.ts`
- Modify: `src/mastra/index.ts`

- [ ] **Step 1: Add document routes**

Create `src/mastra/api/project-documents-routes.ts`:

```ts
import { registerApiRoute } from "@mastra/core/server";
import { z } from "zod";
import { ingestProjectDocument } from "../rag/document-service";
import { retrieveProjectContext } from "../rag/retrieval-service";

const IngestDocumentSchema = z.object({
  sourceName: z.string().min(1),
  sourceType: z.enum(["prd", "meeting_notes", "technical_notes", "architecture", "other"]).default("other"),
  content: z.string().min(1),
});

export const projectDocumentRoutes = [
  registerApiRoute("/api/projects/:projectId/documents", {
    method: "POST",
    handler: async (c) => {
      const projectId = c.req.param("projectId");
      const body = IngestDocumentSchema.parse(await c.req.json());
      const result = await ingestProjectDocument({
        projectId,
        documentId: crypto.randomUUID(),
        sourceName: body.sourceName,
        sourceType: body.sourceType,
        content: body.content,
      });
      return c.json(result, 201);
    },
  }),
  registerApiRoute("/api/projects/:projectId/context/search", {
    method: "POST",
    handler: async (c) => {
      const projectId = c.req.param("projectId");
      const body = z.object({ query: z.string().min(1), topK: z.number().int().positive().optional() }).parse(await c.req.json());
      const chunks = await retrieveProjectContext({ projectId, query: body.query, topK: body.topK });
      return c.json({ chunks });
    },
  }),
];
```

- [ ] **Step 2: Add delivery plan routes**

Create `src/mastra/api/delivery-plan-routes.ts`:

```ts
import { registerApiRoute } from "@mastra/core/server";
import { z } from "zod";

const StartPlanSchema = z.object({
  projectName: z.string().min(1),
  projectDescription: z.string().optional(),
  rawInput: z.string().min(1),
  planTitle: z.string().optional(),
  useRag: z.boolean().default(true),
  cacheMode: z.enum(["use", "refresh", "bypass"]).default("use"),
});

export const deliveryPlanRoutes = [
  registerApiRoute("/api/delivery-plans", {
    method: "POST",
    handler: async (c) => {
      const body = StartPlanSchema.parse(await c.req.json());
      const mastra = c.get("mastra");
      const workflow = mastra.getWorkflow("deliveryCopilotWorkflow");
      const run = await workflow.createRunAsync();
      const result = await run.start({ inputData: body });
      return c.json({ runId: run.runId, result });
    },
  }),
];
```

- [ ] **Step 3: Register API routes**

Modify `src/mastra/index.ts`:

```ts
import { projectDocumentRoutes } from "./api/project-documents-routes";
import { deliveryPlanRoutes } from "./api/delivery-plan-routes";
```

Add to `new Mastra({ ... })`:

```ts
server: {
  build: {
    swaggerUI: true,
    openAPIDocs: true,
  },
  cors: {
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["content-type", "authorization"],
  },
  apiRoutes: [
    ...projectDocumentRoutes,
    ...deliveryPlanRoutes,
  ],
},
```

- [ ] **Step 4: Run type check and build**

Run:

```bash
pnpm exec tsc --noEmit
pnpm build
```

Expected: both commands exit `0`.

---

### Task 8: Add Application-Level Final Plan Cache

**Files:**
- Create: `src/mastra/cache/plan-cache-key.ts`
- Modify: `src/mastra/api/delivery-plan-routes.ts`
- Modify: `src/db/repositories/plan-cache-repository.ts`
- Create: `tests/cache/plan-cache-key.test.ts`

- [ ] **Step 1: Add deterministic cache key test**

Create `tests/cache/plan-cache-key.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPlanCacheKey } from "../../src/mastra/cache/plan-cache-key.ts";

test("buildPlanCacheKey is stable for equivalent inputs", () => {
  const first = buildPlanCacheKey({
    rawInput: "Build QueueLite.",
    modelId: "ollama-cloud/gpt-oss:120b",
    documentHashes: ["b", "a"],
    retrievalConfig: { topK: 6, minScore: 0.55 },
  });
  const second = buildPlanCacheKey({
    rawInput: "Build QueueLite.",
    modelId: "ollama-cloud/gpt-oss:120b",
    documentHashes: ["a", "b"],
    retrievalConfig: { minScore: 0.55, topK: 6 },
  });

  assert.equal(first, second);
});
```

- [ ] **Step 2: Implement key builder**

Create `src/mastra/cache/plan-cache-key.ts`:

```ts
import { createHash } from "node:crypto";

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function buildPlanCacheKey(input: {
  rawInput: string;
  modelId: string;
  documentHashes: string[];
  retrievalConfig: Record<string, unknown>;
}): string {
  return createHash("sha256")
    .update(stableStringify({
      rawInput: input.rawInput,
      modelId: input.modelId,
      documentHashes: [...input.documentHashes].sort(),
      retrievalConfig: input.retrievalConfig,
    }))
    .digest("hex");
}
```

- [ ] **Step 3: Use cache in `POST /api/delivery-plans`**

Before starting the workflow:

```ts
if (body.cacheMode === "use") {
  const cached = await findPlanCacheEntry(cacheKey);
  if (cached?.workflowRunId) {
    return c.json({ cacheHit: true, workflowRunId: cached.workflowRunId });
  }
}
```

After successful workflow completion, write a cache entry with the final plan ID.

- [ ] **Step 4: Run tests**

Run:

```bash
node --experimental-strip-types --test tests/cache/plan-cache-key.test.ts
pnpm exec tsc --noEmit
```

Expected: both commands exit `0`.

---

### Task 9: Observability and Frontend Diagnostics

**Files:**
- Modify: `src/mastra/rag/retrieval-service.ts`
- Modify: `src/mastra/api/project-documents-routes.ts`
- Modify: `src/mastra/api/delivery-plan-routes.ts`

- [ ] **Step 1: Return retrieval metadata to frontend**

For context preview, return:

```ts
{
  chunks,
  retrieval: {
    topK: body.topK ?? ragConfig.topK,
    minScore: ragConfig.minScore,
    indexName: ragConfig.indexName,
  },
}
```

- [ ] **Step 2: Return cache metadata to frontend**

For delivery plan start, return:

```ts
{
  cacheHit: false,
  cacheMode: body.cacheMode,
  runId: run.runId,
  result,
}
```

For final-plan cache hit, return:

```ts
{
  cacheHit: true,
  cacheMode: body.cacheMode,
  workflowRunId: cached.workflowRunId,
}
```

- [ ] **Step 3: Add route-level error messages**

Wrap route handlers with `try/catch` and return:

```ts
return c.json(
  {
    error: error instanceof Error ? error.message : "Unknown backend error",
  },
  500,
);
```

- [ ] **Step 4: Verify frontend contract**

Run:

```bash
pnpm build
```

Expected: build exits `0`, and Swagger UI includes the custom routes.

---

### Task 10: End-to-End Verification

**Files:**
- Modify: `package.json`
- Create: `tests/api/rag-routes.test.ts`

- [ ] **Step 1: Add a real test script**

Change `package.json`:

```json
"test": "node --experimental-strip-types --test \"tests/**/*.test.ts\""
```

- [ ] **Step 2: Run all local tests**

Run:

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 3: Run type check and production build**

Run:

```bash
pnpm exec tsc --noEmit
pnpm build
```

Expected: both commands exit `0`.

- [ ] **Step 4: Manual API smoke test**

Start the backend:

```bash
pnpm dev
```

In another shell:

```bash
curl -sS -X POST http://localhost:4111/api/projects/00000000-0000-0000-0000-000000000001/context/search \
  -H 'content-type: application/json' \
  --data '{"query":"queue QR code join flow","topK":3}'
```

Expected: JSON response with `chunks` and `retrieval`. If no documents are indexed, `chunks` is an empty array.

---

## Rollout Sequence

1. Add dependencies, env, and pgvector support.
2. Add document schema and repositories.
3. Add RAG ingestion and retrieval services.
4. Wire retrieval into workflow prompts.
5. Add response cache to agents.
6. Add frontend-facing API routes.
7. Add final-plan cache.
8. Expose diagnostics and run end-to-end verification.

## Decisions

- Use Postgres/PgVector first because the project already depends on Postgres and `@mastra/pg`.
- Keep RAG retrieval outside agent tool calls for the workflow path so structured output remains simpler and predictable.
- Use Mastra `ResponseCache` for LLM response replay, not as the only cache layer.
- Add a separate final-plan cache because frontend users expect repeated submissions to return instantly when inputs and project documents have not changed.
- Keep provider prompt caching as a prompt-shaping concern, not a guaranteed feature, because provider support differs and the current runtime uses `ollama-cloud/gpt-oss:120b`.

## Risks

- If `pgvector` is not available in the deployed Postgres instance, document ingestion will fail before vectors can be stored.
- If retrieved chunks are too large, agent calls can regress into provider 500s or malformed structured output.
- If response cache scope is too broad, project data can leak across tenants.
- If final-plan cache keys omit document hashes or retrieval config, stale plans can be returned after context changes.

## Open Questions

- Should document upload support files immediately, or is text-only ingestion enough for the first frontend integration?
- Should the frontend poll workflow status, or should we add a streaming/SSE route for plan generation progress?
- Should production response caching use Redis now, or is in-memory cache acceptable until deployment topology is confirmed?

## Self-Review

- Spec coverage: The plan covers RAG ingestion, retrieval, prompt injection, response caching, final-plan caching, frontend API routes, environment config, schema, and verification.
- Completeness scan: Every task has concrete files, commands, and expected behavior.
- Type consistency: Names used across tasks are consistent: `ragConfig`, `retrieveProjectContext`, `renderRetrievedContext`, `createAgentResponseCache`, and `buildPlanCacheKey`.
- Scope check: This is one backend feature set with related persistence, retrieval, and frontend API boundaries; it is large but coherent enough to execute in sequence.
