import { z } from "zod";
import { projectDocumentSourceTypes } from "../../db/schema.ts";

type EnvLike = Record<string, string | undefined>;

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function readNumber(value: string | undefined, fallback: number): number {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readOptionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function normalizeBaseUrl(value: string | undefined): string | undefined {
  return readOptionalString(value)?.replace(/\/+$/, "");
}

function defaultEmbeddingDimension(model: string | undefined): number {
  if (!model) return 1536;

  const normalized = model.toLowerCase();
  if (normalized.includes("text-embedding-3-large")) return 3072;
  if (normalized.includes("gemini-embedding-001")) return 768;
  if (normalized.includes("nomic-embed-text")) return 768;
  if (normalized.includes("mxbai-embed-large")) return 1024;
  return 1536;
}

export const ProjectDocumentSourceTypeSchema = z.enum(projectDocumentSourceTypes);

export function readRagConfig(env: EnvLike = process.env) {
  const embeddingModel = readOptionalString(env.RAG_EMBEDDING_MODEL);

  return {
    enabled: readBoolean(env.RAG_ENABLED, Boolean(embeddingModel)),
    indexName: env.RAG_VECTOR_INDEX ?? "project_documents",
    embeddingModel,
    embeddingBaseUrl: normalizeBaseUrl(env.RAG_EMBEDDING_BASE_URL),
    embeddingApiKey: readOptionalString(env.RAG_EMBEDDING_API_KEY),
    embeddingDimension: readNumber(
      env.RAG_EMBEDDING_DIMENSION,
      defaultEmbeddingDimension(embeddingModel),
    ),
    chunkSize: readNumber(env.RAG_CHUNK_SIZE, 800),
    chunkOverlap: readNumber(env.RAG_CHUNK_OVERLAP, 120),
    topK: readNumber(env.RAG_TOP_K, 6),
    minScore: readNumber(env.RAG_MIN_SCORE, 0.55),
  };
}

export type RagConfig = ReturnType<typeof readRagConfig>;

export type RagEmbeddingModelConfig =
  | string
  | {
      providerId: string;
      modelId: string;
      url?: string;
      apiKey?: string;
    };

export function createRagEmbeddingModelConfig(
  config: RagConfig = ragConfig,
): RagEmbeddingModelConfig {
  if (!config.embeddingModel) {
    throw new Error("RAG_EMBEDDING_MODEL is not configured");
  }

  const [providerId, ...modelParts] = config.embeddingModel.split("/");
  const modelId = modelParts.join("/");
  if (!providerId || !modelId) {
    throw new Error(
      `RAG_EMBEDDING_MODEL must use provider/model-name format; received "${config.embeddingModel}"`,
    );
  }

  if (config.embeddingBaseUrl) {
    return {
      providerId,
      modelId,
      url: config.embeddingBaseUrl,
      apiKey: config.embeddingApiKey ?? "",
    };
  }

  return {
    providerId,
    modelId,
  };
}

export const ragConfig = readRagConfig();

export type ProjectDocumentSourceType = z.infer<typeof ProjectDocumentSourceTypeSchema>;
