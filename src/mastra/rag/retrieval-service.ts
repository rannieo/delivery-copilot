import { ModelRouterEmbeddingModel } from "@mastra/core/llm";
import { embed } from "ai";
import { createRagEmbeddingModelConfig, ragConfig } from "./config.ts";
import { ensureProjectVectorIndex, getProjectVectorStore } from "./vector-store.ts";

export type RetrievedContextChunk = {
  text: string;
  sourceName: string;
  sourceType: string;
  score: number;
  documentId?: string;
  chunkIndex?: number;
};

function readMetadataString(metadata: Record<string, unknown>, key: string, fallback: string): string {
  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function readMetadataNumber(metadata: Record<string, unknown>, key: string): number | undefined {
  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function renderRetrievedContext(chunks: RetrievedContextChunk[]): string {
  if (chunks.length === 0) {
    return "No retrieved project context.";
  }

  return [
    "## Retrieved Project Context",
    ...chunks.map((chunk, index) => {
      const score = Number.isFinite(chunk.score) ? chunk.score.toFixed(3) : "n/a";
      const chunkLabel =
        typeof chunk.chunkIndex === "number" ? `, chunk ${chunk.chunkIndex + 1}` : "";

      return `
### Source ${index + 1}: ${chunk.sourceName}
- Type: ${chunk.sourceType}${chunkLabel}
- Score: ${score}

${chunk.text}`;
    }),
  ].join("\n");
}

export async function retrieveProjectContext(input: {
  projectId: string;
  query: string;
  topK?: number;
  minScore?: number;
}): Promise<RetrievedContextChunk[]> {
  if (!ragConfig.enabled) {
    return [];
  }

  await ensureProjectVectorIndex();

  const model = new ModelRouterEmbeddingModel(createRagEmbeddingModelConfig());
  const { embedding } = await embed({
    model,
    value: input.query,
    maxRetries: 1,
  });

  const results = await getProjectVectorStore().query({
    indexName: ragConfig.indexName,
    queryVector: embedding,
    topK: input.topK ?? ragConfig.topK,
    minScore: input.minScore ?? ragConfig.minScore,
    filter: {
      projectId: input.projectId,
    },
  });

  return results
    .map((result) => {
      const metadata = (result.metadata ?? {}) as Record<string, unknown>;
      const text = readMetadataString(metadata, "text", result.document ?? "");

      return {
        text,
        sourceName: readMetadataString(metadata, "sourceName", "Project document"),
        sourceType: readMetadataString(metadata, "sourceType", "other"),
        score: result.score,
        documentId: readMetadataString(metadata, "documentId", ""),
        chunkIndex: readMetadataNumber(metadata, "chunkIndex"),
      };
    })
    .filter((chunk) => chunk.text.trim().length > 0);
}

export async function retrieveProjectContextForPrompt(input: {
  projectId: string;
  query: string;
  topK?: number;
}): Promise<string> {
  try {
    const chunks = await retrieveProjectContext(input);
    return renderRetrievedContext(chunks);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown RAG retrieval error";
    return `No retrieved project context.\n\nRAG retrieval warning: ${message}`;
  }
}
