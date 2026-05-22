import assert from "node:assert/strict";
import { test } from "node:test";
import {
  readModelIdFromEnv,
  validateModelIdentifier,
  validateModelConfiguration,
  validateModelProviderCredential,
} from "../../src/mastra/config/index.ts";

test("readModelIdFromEnv prefers the configured environment value", () => {
  assert.equal(
    readModelIdFromEnv({
      env: { AGENT_MODEL: "openai/gpt-4.1" },
      envName: "AGENT_MODEL",
      fallback: "ollama-cloud/gpt-oss:120b",
    }),
    "openai/gpt-4.1",
  );
});

test("validateModelIdentifier requires provider slash model format", () => {
  assert.throws(
    () => validateModelIdentifier("gpt-4.1", "AGENT_MODEL"),
    /AGENT_MODEL must use provider\/model-name format/,
  );
});

test("validateModelProviderCredential requires Ollama Cloud credentials", () => {
  assert.throws(
    () =>
      validateModelProviderCredential({
        env: {},
        envName: "AGENT_MODEL",
        model: "ollama-cloud/gpt-oss:120b",
      }),
    /AGENT_MODEL uses ollama-cloud\/gpt-oss:120b but OLLAMA_API_KEY is not configured/,
  );
});

test("validateModelProviderCredential requires OpenAI credentials", () => {
  assert.throws(
    () =>
      validateModelProviderCredential({
        env: {},
        envName: "RAG_EMBEDDING_MODEL",
        model: "openai/text-embedding-3-small",
      }),
    /RAG_EMBEDDING_MODEL uses openai\/text-embedding-3-small but OPENAI_API_KEY is not configured/,
  );
});

test("validateModelConfiguration does not require embedding credentials when RAG is disabled", () => {
  assert.doesNotThrow(() =>
    validateModelConfiguration({
      agentModel: "ollama-cloud/gpt-oss:120b",
      embeddingModel: undefined,
      ragEnabled: false,
      env: { OLLAMA_API_KEY: "test-key" },
    }),
  );
});

test("validateModelConfiguration requires an embedding model when RAG is enabled", () => {
  assert.throws(
    () =>
      validateModelConfiguration({
        agentModel: "ollama-cloud/gpt-oss:120b",
        embeddingModel: undefined,
        ragEnabled: true,
        env: { OLLAMA_API_KEY: "test-key" },
      }),
    /RAG_ENABLED is true but RAG_EMBEDDING_MODEL is not configured/,
  );
});

test("validateModelConfiguration allows local Ollama-compatible embeddings without OpenAI credentials", () => {
  assert.doesNotThrow(() =>
    validateModelConfiguration({
      agentModel: "ollama-cloud/gpt-oss:120b",
      embeddingModel: "ollama/nomic-embed-text",
      embeddingBaseUrl: "http://localhost:11434/v1",
      ragEnabled: true,
      env: { OLLAMA_API_KEY: "test-key" },
    }),
  );
});
