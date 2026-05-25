import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createLangChainOpenAIEmbeddingsConfig,
  embedTextDocuments,
  embedTextQuery,
  type RagEmbeddingDeps,
} from "../../src/mastra/rag/embeddings.ts";
import type { RagConfig } from "../../src/mastra/rag/config.ts";

function createConfig(overrides: Partial<RagConfig> = {}): RagConfig {
  return {
    enabled: true,
    indexName: "project_document_vectors",
    embeddingDriver: "mastra",
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

test("embedTextDocuments uses LangChain embedDocuments when configured", async () => {
  let receivedTexts: string[] = [];

  const embeddings = await embedTextDocuments(
    ["first chunk", "second chunk"],
    createConfig({ embeddingDriver: "langchain-openai" }),
    {
      createLangChainOpenAIEmbeddings: async () => ({
        embedDocuments: async (texts) => {
          receivedTexts = texts;
          return [
            [0.1, 0.2],
            [0.3, 0.4],
          ];
        },
        embedQuery: async () => [0],
      }),
    },
  );

  assert.deepEqual(receivedTexts, ["first chunk", "second chunk"]);
  assert.deepEqual(embeddings, [
    [0.1, 0.2],
    [0.3, 0.4],
  ]);
});

test("embedTextQuery uses LangChain embedQuery when configured", async () => {
  let receivedQuery = "";

  const embedding = await embedTextQuery(
    "project search query",
    createConfig({ embeddingDriver: "langchain-openai" }),
    {
      createLangChainOpenAIEmbeddings: async () => ({
        embedDocuments: async () => [],
        embedQuery: async (query) => {
          receivedQuery = query;
          return [0.5, 0.6];
        },
      }),
    },
  );

  assert.equal(receivedQuery, "project search query");
  assert.deepEqual(embedding, [0.5, 0.6]);
});

test("embedTextDocuments keeps the Mastra driver as the default", async () => {
  let receivedValues: string[] = [];
  const markerModel = {};

  const embeddings = await embedTextDocuments(["chunk"], createConfig(), {
    createMastraEmbeddingModel: () => markerModel,
    embedMany: async (input) => {
      assert.equal(input.model, markerModel);
      receivedValues = input.values;
      return { embeddings: [[0.7, 0.8]] };
    },
  } as unknown as Partial<RagEmbeddingDeps>);

  assert.deepEqual(receivedValues, ["chunk"]);
  assert.deepEqual(embeddings, [[0.7, 0.8]]);
});

test("createLangChainOpenAIEmbeddingsConfig strips the provider prefix", () => {
  assert.deepEqual(
    createLangChainOpenAIEmbeddingsConfig(
      createConfig({
        embeddingBaseUrl: "https://example.test/v1",
        embeddingApiKey: "test-key",
      }),
    ),
    {
      model: "text-embedding-3-small",
      apiKey: "test-key",
      configuration: {
        baseURL: "https://example.test/v1",
      },
    },
  );
});
