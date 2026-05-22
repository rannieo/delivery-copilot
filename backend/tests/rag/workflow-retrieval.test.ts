import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAgentRetrievalQuery } from "../../src/mastra/rag/workflow-retrieval.ts";

test("buildAgentRetrievalQuery includes role and project input", () => {
  const query = buildAgentRetrievalQuery({
    role: "Backend Lead Agent",
    rawInput: "Build QueueLite with QR queue join and staff queue controls.",
  });

  assert.match(query, /Backend Lead Agent/);
  assert.match(query, /QueueLite/);
  assert.match(query, /QR queue join/);
});
