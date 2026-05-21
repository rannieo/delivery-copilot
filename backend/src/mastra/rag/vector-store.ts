import { PgVector } from "@mastra/pg";
import { ragConfig } from "./config.ts";

let projectVectorStore: PgVector | null = null;
let ensureIndexPromise: Promise<void> | null = null;

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

export async function ensureProjectVectorIndex(): Promise<void> {
  if (ensureIndexPromise) {
    return ensureIndexPromise;
  }

  ensureIndexPromise = getProjectVectorStore()
    .createIndex({
      indexName: ragConfig.indexName,
      dimension: ragConfig.embeddingDimension,
      metric: "cosine",
      metadataIndexes: ["projectId", "documentId", "sourceType"],
    })
    .catch((error) => {
      ensureIndexPromise = null;
      throw error;
    });

  return ensureIndexPromise;
}
