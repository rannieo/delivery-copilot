import { PgVector } from "@mastra/pg";
import { ragConfig, type RagConfig } from "./config.ts";

let projectVectorStore: PgVector | null = null;
let ensureIndexPromise: Promise<void> | null = null;

type PgVectorExtensionClient = {
  query: (sql: string) => Promise<unknown>;
};

type ProjectVectorIndexStore = {
  pool: PgVectorExtensionClient;
  createIndex: (input: {
    indexName: string;
    dimension: number;
    metric: "cosine";
    metadataIndexes: string[];
  }) => Promise<unknown>;
};

export function getProjectVectorStore(): PgVector {
  if (projectVectorStore) {
    return projectVectorStore;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for project RAG vector storage");
  }

  projectVectorStore = new PgVector({
    id: "project-rag-vector-store",
    connectionString: process.env.DATABASE_URL,
  });

  return projectVectorStore;
}

export async function ensurePgVectorExtension(
  client: PgVectorExtensionClient,
): Promise<void> {
  await client.query("CREATE EXTENSION IF NOT EXISTS vector");
}

export async function ensureProjectVectorIndexWithDeps(input: {
  vectorStore: ProjectVectorIndexStore;
  config: RagConfig;
}): Promise<void> {
  await ensurePgVectorExtension(input.vectorStore.pool);
  await input.vectorStore.createIndex({
    indexName: input.config.indexName,
    dimension: input.config.embeddingDimension,
    metric: "cosine",
    metadataIndexes: ["projectId", "documentId", "sourceType"],
  });
}

export async function ensureProjectVectorIndex(): Promise<void> {
  if (ensureIndexPromise) {
    return ensureIndexPromise;
  }

  ensureIndexPromise = ensureProjectVectorIndexWithDeps({
    vectorStore: getProjectVectorStore(),
    config: ragConfig,
  })
    .catch((error) => {
      ensureIndexPromise = null;
      throw error;
    });

  return ensureIndexPromise;
}
