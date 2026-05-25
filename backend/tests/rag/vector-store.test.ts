import assert from "node:assert/strict";
import { test } from "node:test";
import { ensureProjectVectorIndexWithDeps } from "../../src/mastra/rag/vector-store.ts";
import type { RagConfig } from "../../src/mastra/rag/config.ts";

function createConfig(overrides: Partial<RagConfig> = {}): RagConfig {
  return {
    enabled: true,
    indexName: "project_document_vectors",
    embeddingDriver: "langchain-openai",
    embeddingModel: "openai/text-embedding-3-small",
    embeddingBaseUrl: undefined,
    embeddingApiKey: undefined,
    embeddingDimension: 1536,
    chunkSize: 800,
    chunkOverlap: 120,
    topK: 6,
    minScore: 0.55,
    ...overrides,
  };
}

test("ensureProjectVectorIndexWithDeps creates pgvector extension before vector index", async () => {
  const calls: string[] = [];

  await ensureProjectVectorIndexWithDeps({
    config: createConfig(),
    vectorStore: {
      pool: {
        query: async (sql: string) => {
          calls.push(sql);
          return {};
        },
      },
      createIndex: async ({ indexName }: { indexName: string }) => {
        calls.push(`createIndex:${indexName}`);
      },
    },
  });

  assert.deepEqual(calls, [
    "CREATE EXTENSION IF NOT EXISTS vector",
    "createIndex:project_document_vectors",
  ]);
});
