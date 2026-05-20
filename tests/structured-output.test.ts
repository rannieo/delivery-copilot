import assert from "node:assert/strict";
import { test } from "node:test";
import {
  coerceAgentArtifactPayload,
  coerceFinalPlanPayload,
} from "../src/mastra/helpers/structured-output.ts";

test("coerceAgentArtifactPayload parses fenced JSON from model text", () => {
  const payload = coerceAgentArtifactPayload({
    agentId: "product-analyst-agent",
    object: undefined,
    text: `Here is the artifact:

\`\`\`json
{
  "markdown": "# Product Requirements Analysis\\n\\n## Summary\\nQueueLite MVP.",
  "summary": "QueueLite MVP defines QR-based queue joining and staff queue operations.",
  "assumptions": ["The MVP uses a browser-based customer experience."],
  "risks": ["If real-time updates lag, then staff and customers may see inconsistent queue positions."],
  "openQuestions": ["Which authentication mechanism should Admin and Staff use?"]
}
\`\`\`
`,
  });

  assert.equal(payload.markdown.startsWith("# Product Requirements Analysis"), true);
  assert.equal(payload.summary.includes("QueueLite MVP"), true);
  assert.deepEqual(payload.assumptions, ["The MVP uses a browser-based customer experience."]);
});

test("coerceAgentArtifactPayload falls back to markdown when no JSON object is present", () => {
  const payload = coerceAgentArtifactPayload({
    agentId: "product-analyst-agent",
    object: undefined,
    text: `# Product Requirements Analysis

QueueLite is a browser-based queue management system.

## Risks
- If the QR URL is unreachable, then customers cannot join the queue.

## Open Questions
- Which authentication mechanism should Admin and Staff use?
`,
  });

  assert.equal(payload.markdown.startsWith("# Product Requirements Analysis"), true);
  assert.equal(payload.summary, "QueueLite is a browser-based queue management system.");
  assert.deepEqual(payload.risks, [
    "If the QR URL is unreachable, then customers cannot join the queue.",
  ]);
  assert.deepEqual(payload.openQuestions, [
    "Which authentication mechanism should Admin and Staff use?",
  ]);
});

test("coerceFinalPlanPayload falls back to markdown text", () => {
  const payload = coerceFinalPlanPayload({
    object: undefined,
    text: "# Technical Delivery Plan\n\nFinal plan body.",
  });

  assert.equal(payload.markdown, "# Technical Delivery Plan\n\nFinal plan body.");
});
