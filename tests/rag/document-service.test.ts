import assert from "node:assert/strict";
import { test } from "node:test";
import { buildChunkMetadata, sha256 } from "../../src/mastra/rag/document-service.ts";

test("sha256 returns a stable content hash", () => {
  assert.equal(
    sha256("Admin can create counters."),
    "ac2a015d15049b6cce17d4e782a80e1abef32a38c8ba8ed260db1180eca755d7",
  );
});

test("buildChunkMetadata creates stable frontend-safe metadata", () => {
  const metadata = buildChunkMetadata({
    projectId: "project-1",
    documentId: "doc-1",
    sourceName: "QueueLite PRD",
    sourceType: "prd",
    chunkIndex: 2,
    text: "Admin can create counters.",
  });

  assert.equal(metadata.projectId, "project-1");
  assert.equal(metadata.documentId, "doc-1");
  assert.equal(metadata.sourceName, "QueueLite PRD");
  assert.equal(metadata.sourceType, "prd");
  assert.equal(metadata.chunkIndex, 2);
  assert.equal(metadata.text, "Admin can create counters.");
  assert.equal(metadata.textHash.length, 64);
});
