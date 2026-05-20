import { createHash } from "node:crypto";
import { ModelRouterEmbeddingModel } from "@mastra/core/llm";
import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";
import type { ProjectDocument } from "../../db/repositories/project-document-repository.ts";
import { ragConfig, type ProjectDocumentSourceType } from "./config.ts";
import { ensureProjectVectorIndex, getProjectVectorStore } from "./vector-store.ts";

export type ProjectDocumentChunkMetadata = {
  projectId: string;
  documentId: string;
  sourceName: string;
  sourceType: ProjectDocumentSourceType;
  chunkIndex: number;
  text: string;
  textHash: string;
};

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function buildChunkMetadata(input: {
  projectId: string;
  documentId: string;
  sourceName: string;
  sourceType: ProjectDocumentSourceType;
  chunkIndex: number;
  text: string;
}): ProjectDocumentChunkMetadata {
  return {
    ...input,
    textHash: sha256(input.text),
  };
}

export async function chunkDocumentText(text: string): Promise<string[]> {
  const doc = MDocument.fromMarkdown(text);
  const chunks = await doc.chunk({
    strategy: "markdown",
    maxSize: ragConfig.chunkSize,
    overlap: ragConfig.chunkOverlap,
    headers: [
      ["#", "title"],
      ["##", "section"],
    ],
    stripWhitespace: true,
  });

  return chunks.map((chunk) => chunk.text.trim()).filter((chunkText) => chunkText.length > 0);
}

export async function ingestProjectDocument(input: {
  projectId: string;
  sourceName: string;
  sourceType: ProjectDocumentSourceType;
  content: string;
}): Promise<ProjectDocument> {
  const {
    createProjectDocument,
    replaceProjectDocumentChunks,
    updateProjectDocumentStatus,
  } = await import("../../db/repositories/project-document-repository.ts");

  if (!ragConfig.enabled) {
    throw new Error("Project RAG is disabled");
  }

  const document = await createProjectDocument({
    projectId: input.projectId,
    sourceName: input.sourceName,
    sourceType: input.sourceType,
    contentHash: sha256(input.content),
  });

  try {
    const chunks = await chunkDocumentText(input.content);
    if (chunks.length === 0) {
      throw new Error("Document content produced no indexable chunks");
    }

    const metadata = chunks.map((text, chunkIndex) =>
      buildChunkMetadata({
        projectId: input.projectId,
        documentId: document.id,
        sourceName: input.sourceName,
        sourceType: input.sourceType,
        chunkIndex,
        text,
      }),
    );

    await ensureProjectVectorIndex();

    const model = new ModelRouterEmbeddingModel(ragConfig.embeddingModel);
    const { embeddings } = await embedMany({
      model,
      values: chunks,
      maxParallelCalls: 2,
      maxRetries: 1,
    });

    const vectorIds = metadata.map(
      (chunkMetadata) =>
        `${chunkMetadata.documentId}:${chunkMetadata.chunkIndex}:${chunkMetadata.textHash.slice(0, 12)}`,
    );

    await getProjectVectorStore().upsert({
      indexName: ragConfig.indexName,
      vectors: embeddings,
      ids: vectorIds,
      metadata,
      deleteFilter: {
        documentId: document.id,
      },
    });

    await replaceProjectDocumentChunks({
      projectId: input.projectId,
      documentId: document.id,
      chunks: metadata.map((chunkMetadata, index) => ({
        vectorId: vectorIds[index]!,
        chunkIndex: chunkMetadata.chunkIndex,
        text: chunkMetadata.text,
        metadata: chunkMetadata,
      })),
    });

    await updateProjectDocumentStatus({
      documentId: document.id,
      status: "indexed",
      chunkCount: chunks.length,
      errorMessage: null,
    });

    return {
      ...document,
      status: "indexed",
      chunkCount: chunks.length,
      errorMessage: null,
    };
  } catch (error) {
    await updateProjectDocumentStatus({
      documentId: document.id,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown document ingestion error",
    });
    throw error;
  }
}
