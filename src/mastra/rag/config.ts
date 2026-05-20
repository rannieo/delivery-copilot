import { z } from "zod";
import { projectDocumentSourceTypes } from "../../db/schema.ts";

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function readNumber(value: string | undefined, fallback: number): number {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const ProjectDocumentSourceTypeSchema = z.enum(projectDocumentSourceTypes);

export const ragConfig = {
  enabled: readBoolean(process.env.RAG_ENABLED, true),
  indexName: process.env.RAG_VECTOR_INDEX ?? "project_documents",
  embeddingModel: process.env.RAG_EMBEDDING_MODEL ?? "openai/text-embedding-3-small",
  embeddingDimension: readNumber(process.env.RAG_EMBEDDING_DIMENSION, 1536),
  chunkSize: readNumber(process.env.RAG_CHUNK_SIZE, 800),
  chunkOverlap: readNumber(process.env.RAG_CHUNK_OVERLAP, 120),
  topK: readNumber(process.env.RAG_TOP_K, 6),
  minScore: readNumber(process.env.RAG_MIN_SCORE, 0.55),
};

export type ProjectDocumentSourceType = z.infer<typeof ProjectDocumentSourceTypeSchema>;
