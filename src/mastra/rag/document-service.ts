import { createHash } from "node:crypto";
import { ModelRouterEmbeddingModel } from "@mastra/core/llm";
import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";
import type { ProjectDocument } from "../../db/repositories/project-document-repository.ts";
import {
  createRagEmbeddingModelConfig,
  ragConfig,
  type ProjectDocumentSourceType,
} from "./config.ts";
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

type ProjectDocumentStatusInput = {
  documentId: string;
  status: ProjectDocument["status"];
  chunkCount?: number;
  errorMessage?: string | null;
};

export type ProjectDocumentIngestionDeps = {
  ragEnabled: boolean;
  createProjectDocument: (input: {
    projectId: string;
    sourceName: string;
    sourceType: ProjectDocumentSourceType;
    contentHash: string;
  }) => Promise<ProjectDocument>;
  chunkDocumentText: (text: string) => Promise<string[]>;
  ensureProjectVectorIndex: () => Promise<void>;
  embedChunks: (chunks: string[]) => Promise<number[][]>;
  upsertVectors: (input: {
    documentId: string;
    vectorIds: string[];
    embeddings: number[][];
    metadata: ProjectDocumentChunkMetadata[];
  }) => Promise<void>;
  deleteVectors: (input: { ids: string[] }) => Promise<void>;
  replaceProjectDocumentChunks: (input: {
    projectId: string;
    documentId: string;
    chunks: Array<{
      vectorId: string;
      chunkIndex: number;
      text: string;
      metadata: Record<string, unknown>;
    }>;
  }) => Promise<unknown>;
  updateProjectDocumentStatus: (input: ProjectDocumentStatusInput) => Promise<void>;
};

export type ProjectDocumentDeindexDeps = {
  listProjectDocumentVectorIds: (input: { documentId: string }) => Promise<string[]>;
  ensureProjectVectorIndex: () => Promise<void>;
  deleteVectors: (input: { ids: string[] }) => Promise<void>;
  deleteProjectDocument: (input: { documentId: string }) => Promise<void>;
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

async function embedDocumentChunks(chunks: string[]): Promise<number[][]> {
  const model = new ModelRouterEmbeddingModel(createRagEmbeddingModelConfig());
  const { embeddings } = await embedMany({
    model,
    values: chunks,
    maxParallelCalls: 2,
    maxRetries: 1,
  });

  return embeddings;
}

async function upsertProjectDocumentVectors(input: {
  documentId: string;
  vectorIds: string[];
  embeddings: number[][];
  metadata: ProjectDocumentChunkMetadata[];
}): Promise<void> {
  await getProjectVectorStore().upsert({
    indexName: ragConfig.indexName,
    vectors: input.embeddings,
    ids: input.vectorIds,
    metadata: input.metadata,
    deleteFilter: {
      documentId: input.documentId,
    },
  });
}

async function deleteProjectDocumentVectors(input: { ids: string[] }): Promise<void> {
  if (input.ids.length === 0) {
    return;
  }

  await getProjectVectorStore().deleteVectors({
    indexName: ragConfig.indexName,
    ids: input.ids,
  });
}

export async function ingestProjectDocumentWithDeps(
  input: {
    projectId: string;
    sourceName: string;
    sourceType: ProjectDocumentSourceType;
    content: string;
  },
  deps: ProjectDocumentIngestionDeps,
): Promise<ProjectDocument> {
  if (!deps.ragEnabled) {
    throw new Error("Project RAG is disabled");
  }

  const document = await deps.createProjectDocument({
    projectId: input.projectId,
    sourceName: input.sourceName,
    sourceType: input.sourceType,
    contentHash: sha256(input.content),
  });

  let vectorIds: string[] = [];
  let vectorsUpserted = false;

  try {
    const chunks = await deps.chunkDocumentText(input.content);
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

    await deps.ensureProjectVectorIndex();

    const embeddings = await deps.embedChunks(chunks);

    vectorIds = metadata.map(
      (chunkMetadata) =>
        `${chunkMetadata.documentId}:${chunkMetadata.chunkIndex}:${chunkMetadata.textHash.slice(0, 12)}`,
    );

    await deps.upsertVectors({
      documentId: document.id,
      vectorIds,
      embeddings,
      metadata,
    });
    vectorsUpserted = true;

    await deps.replaceProjectDocumentChunks({
      projectId: input.projectId,
      documentId: document.id,
      chunks: metadata.map((chunkMetadata, index) => ({
        vectorId: vectorIds[index]!,
        chunkIndex: chunkMetadata.chunkIndex,
        text: chunkMetadata.text,
        metadata: chunkMetadata,
      })),
    });

    await deps.updateProjectDocumentStatus({
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
    if (vectorsUpserted && vectorIds.length > 0) {
      try {
        await deps.deleteVectors({ ids: vectorIds });
      } catch {
        // Preserve the original ingestion failure for callers and document status.
      }
    }

    await deps.updateProjectDocumentStatus({
      documentId: document.id,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown document ingestion error",
    });
    throw error;
  }
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

  return ingestProjectDocumentWithDeps(input, {
    ragEnabled: ragConfig.enabled,
    createProjectDocument,
    chunkDocumentText,
    ensureProjectVectorIndex,
    embedChunks: embedDocumentChunks,
    upsertVectors: upsertProjectDocumentVectors,
    deleteVectors: deleteProjectDocumentVectors,
    replaceProjectDocumentChunks,
    updateProjectDocumentStatus,
  });
}

export async function deindexProjectDocumentWithDeps(
  input: {
    documentId: string;
  },
  deps: ProjectDocumentDeindexDeps,
): Promise<void> {
  const vectorIds = await deps.listProjectDocumentVectorIds({ documentId: input.documentId });

  if (vectorIds.length > 0) {
    await deps.ensureProjectVectorIndex();
    await deps.deleteVectors({ ids: vectorIds });
  }

  await deps.deleteProjectDocument({ documentId: input.documentId });
}

export async function deindexProjectDocument(input: {
  documentId: string;
}): Promise<void> {
  const { deleteProjectDocument, listProjectDocumentVectorIds } = await import(
    "../../db/repositories/project-document-repository.ts"
  );

  await deindexProjectDocumentWithDeps(input, {
    listProjectDocumentVectorIds,
    ensureProjectVectorIndex,
    deleteVectors: deleteProjectDocumentVectors,
    deleteProjectDocument,
  });
}
