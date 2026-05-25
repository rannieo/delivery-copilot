import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createRagEmbeddingModelConfig,
  readRagConfig,
} from "../../src/mastra/rag/config.ts";

test("readRagConfig disables RAG by default when no embedding model is configured", () => {
  const config = readRagConfig({});

  assert.equal(config.enabled, false);
  assert.equal(config.indexName, "project_document_vectors");
  assert.equal(config.embeddingDriver, "mastra");
  assert.equal(config.embeddingModel, undefined);
});

test("readRagConfig enables RAG when an embedding model is explicitly configured", () => {
  const config = readRagConfig({
    RAG_EMBEDDING_MODEL: "ollama/nomic-embed-text",
    RAG_EMBEDDING_BASE_URL: "http://localhost:11434/v1/",
  });

  assert.equal(config.enabled, true);
  assert.equal(config.embeddingModel, "ollama/nomic-embed-text");
  assert.equal(config.embeddingBaseUrl, "http://localhost:11434/v1");
});

test("readRagConfig accepts LangChain OpenAI as an opt-in embedding driver", () => {
  const config = readRagConfig({
    RAG_EMBEDDING_DRIVER: "langchain-openai",
    RAG_EMBEDDING_MODEL: "openai/text-embedding-3-small",
  });

  assert.equal(config.embeddingDriver, "langchain-openai");
});

test("readRagConfig rejects unknown embedding drivers", () => {
  assert.throws(
    () => readRagConfig({ RAG_EMBEDDING_DRIVER: "unknown-driver" }),
    /RAG_EMBEDDING_DRIVER must be one of: mastra, langchain-openai/,
  );
});

test("createRagEmbeddingModelConfig builds an OpenAI-compatible local Ollama embedding config", () => {
  assert.deepEqual(
    createRagEmbeddingModelConfig({
      enabled: true,
      indexName: "project_documents",
      embeddingDriver: "mastra",
      embeddingModel: "ollama/nomic-embed-text",
      embeddingBaseUrl: "http://localhost:11434/v1",
      embeddingApiKey: undefined,
      embeddingDimension: 768,
      chunkSize: 800,
      chunkOverlap: 120,
      topK: 6,
      minScore: 0.55,
    }),
    {
      providerId: "ollama",
      modelId: "nomic-embed-text",
      url: "http://localhost:11434/v1",
      apiKey: "",
    },
  );
});
