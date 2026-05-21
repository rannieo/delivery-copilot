import assert from "node:assert/strict";
import { test } from "node:test";
import {
  deindexProjectDocumentWithDeps,
  ingestProjectDocumentWithDeps,
  type ProjectDocumentIngestionDeps,
} from "../../src/mastra/rag/document-service.ts";

const indexedAt = new Date("2026-05-21T00:00:00Z");

function createDocument(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "doc-1",
    projectId: "project-1",
    sourceName: "QueueLite PRD",
    sourceType: "prd",
    contentHash: "hash",
    status: "pending",
    chunkCount: 0,
    errorMessage: null,
    createdAt: indexedAt,
    updatedAt: indexedAt,
    ...overrides,
  };
}

function createIngestionDeps(
  overrides: Partial<ProjectDocumentIngestionDeps> = {},
): ProjectDocumentIngestionDeps {
  return {
    ragEnabled: true,
    createProjectDocument: async () => createDocument(),
    chunkDocumentText: async () => ["Customers scan a QR code."],
    ensureProjectVectorIndex: async () => undefined,
    embedChunks: async () => [[0.1, 0.2, 0.3]],
    upsertVectors: async () => undefined,
    deleteVectors: async () => undefined,
    replaceProjectDocumentChunks: async () => [],
    updateProjectDocumentStatus: async () => undefined,
    ...overrides,
  };
}

test("ingestProjectDocumentWithDeps deletes upserted vectors when DB chunk persistence fails", async () => {
  let deletedVectorIds: string[] = [];
  let failedStatus: unknown;

  const deps = createIngestionDeps({
    replaceProjectDocumentChunks: async () => {
      throw new Error("chunk insert failed");
    },
    deleteVectors: async ({ ids }) => {
      deletedVectorIds = ids;
    },
    updateProjectDocumentStatus: async (input) => {
      failedStatus = input;
    },
  });

  await assert.rejects(
    ingestProjectDocumentWithDeps(
      {
        projectId: "project-1",
        sourceName: "QueueLite PRD",
        sourceType: "prd",
        content: "# QueueLite\nCustomers scan a QR code.",
      },
      deps,
    ),
    /chunk insert failed/,
  );

  assert.deepEqual(deletedVectorIds, [
    "doc-1:0:f2cac38713d5",
  ]);
  assert.deepEqual(failedStatus, {
    documentId: "doc-1",
    status: "failed",
    errorMessage: "chunk insert failed",
  });
});

test("deindexProjectDocumentWithDeps keeps DB rows when vector deletion fails", async () => {
  let dbDeleted = false;

  await assert.rejects(
    deindexProjectDocumentWithDeps(
      { documentId: "doc-1" },
      {
        listProjectDocumentVectorIds: async () => ["vector-1"],
        ensureProjectVectorIndex: async () => undefined,
        deleteVectors: async () => {
          throw new Error("vector delete failed");
        },
        deleteProjectDocument: async () => {
          dbDeleted = true;
        },
      },
    ),
    /vector delete failed/,
  );

  assert.equal(dbDeleted, false);
});

test("deindexProjectDocumentWithDeps deletes DB rows after vector deletion succeeds", async () => {
  let deletedVectors: string[] = [];
  let dbDeleted = false;

  await deindexProjectDocumentWithDeps(
    { documentId: "doc-1" },
    {
      listProjectDocumentVectorIds: async () => ["vector-1", "vector-2"],
      ensureProjectVectorIndex: async () => undefined,
      deleteVectors: async ({ ids }) => {
        deletedVectors = ids;
      },
      deleteProjectDocument: async () => {
        dbDeleted = true;
      },
    },
  );

  assert.deepEqual(deletedVectors, ["vector-1", "vector-2"]);
  assert.equal(dbDeleted, true);
});
