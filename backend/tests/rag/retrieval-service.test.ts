import assert from "node:assert/strict";
import { test } from "node:test";
import { renderRetrievedContext } from "../../src/mastra/rag/retrieval-service.ts";

test("renderRetrievedContext returns bounded source-labeled context", () => {
  const rendered = renderRetrievedContext([
    {
      text: "Customers scan QR codes to join the queue.",
      sourceName: "QueueLite PRD",
      sourceType: "prd",
      score: 0.89,
    },
  ]);

  assert.match(rendered, /Retrieved Project Context/);
  assert.match(rendered, /QueueLite PRD/);
  assert.match(rendered, /Customers scan QR codes/);
  assert.match(rendered, /0\.890/);
});

test("renderRetrievedContext returns an explicit empty state", () => {
  assert.equal(renderRetrievedContext([]), "No retrieved project context.");
});
