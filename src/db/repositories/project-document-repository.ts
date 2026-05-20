import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "../client.ts";
import { projectDocumentChunks, projectDocuments } from "../schema.ts";

export type ProjectDocument = typeof projectDocuments.$inferSelect;
export type ProjectDocumentChunk = typeof projectDocumentChunks.$inferSelect;
export type ProjectDocumentSourceType = ProjectDocument["sourceType"];
export type ProjectDocumentStatus = ProjectDocument["status"];

export async function createProjectDocument(input: {
  projectId: string;
  sourceName: string;
  sourceType: ProjectDocumentSourceType;
  contentHash: string;
}): Promise<ProjectDocument> {
  const [row] = await getDb()
    .insert(projectDocuments)
    .values({
      projectId: input.projectId,
      sourceName: input.sourceName,
      sourceType: input.sourceType,
      contentHash: input.contentHash,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create project document");
  }
  return row;
}

export async function getProjectDocumentById(input: {
  documentId: string;
}): Promise<ProjectDocument | null> {
  const [row] = await getDb()
    .select()
    .from(projectDocuments)
    .where(eq(projectDocuments.id, input.documentId));

  return row ?? null;
}

export async function listProjectDocuments(input: {
  projectId: string;
}): Promise<ProjectDocument[]> {
  return getDb()
    .select()
    .from(projectDocuments)
    .where(eq(projectDocuments.projectId, input.projectId))
    .orderBy(asc(projectDocuments.createdAt));
}

export async function updateProjectDocumentStatus(input: {
  documentId: string;
  status: ProjectDocumentStatus;
  chunkCount?: number;
  errorMessage?: string | null;
}): Promise<void> {
  await getDb()
    .update(projectDocuments)
    .set({
      status: input.status,
      chunkCount: input.chunkCount,
      errorMessage: input.errorMessage,
      updatedAt: sql`now()`,
    })
    .where(eq(projectDocuments.id, input.documentId));
}

export async function replaceProjectDocumentChunks(input: {
  projectId: string;
  documentId: string;
  chunks: Array<{
    vectorId: string;
    chunkIndex: number;
    text: string;
    metadata: Record<string, unknown>;
  }>;
}): Promise<ProjectDocumentChunk[]> {
  const db = getDb();

  await db
    .delete(projectDocumentChunks)
    .where(eq(projectDocumentChunks.documentId, input.documentId));

  if (input.chunks.length === 0) {
    return [];
  }

  return db
    .insert(projectDocumentChunks)
    .values(
      input.chunks.map((chunk) => ({
        projectId: input.projectId,
        documentId: input.documentId,
        vectorId: chunk.vectorId,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        metadata: chunk.metadata,
      })),
    )
    .returning();
}
