import { z } from "zod";
import {
  AgentArtifactOutputSchema,
  FinalPlanOutputSchema,
  type AgentArtifactOutput,
  type FinalPlanOutput,
} from "../shared/schema/agent-artifact-output-schema.ts";

type StructuredPayloadParams = {
  object: unknown;
  text: string | undefined;
};

function cleanText(text: string): string {
  return text.trim().replace(/\r\n/g, "\n");
}

function stripMessagePrefix(text: string): string {
  if (!text.includes("<|message|>")) {
    return text;
  }

  const match = text.match(/<\|message\|>([\s\S]+)$/);
  return match?.[1] ? match[1] : text;
}

function extractFencedJson(text: string): string | undefined {
  const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
  return match?.[1]?.trim();
}

function extractFirstJsonObject(text: string): string | undefined {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
      continue;
    }

    if (char === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return undefined;
}

function parseJsonCandidate(candidate: string): unknown {
  try {
    return JSON.parse(candidate);
  } catch {
    return undefined;
  }
}

export function parseStructuredJsonFromText<T>(text: string | undefined, schema: z.ZodType<T>): T | undefined {
  if (!text?.trim()) {
    return undefined;
  }

  const cleaned = cleanText(stripMessagePrefix(text));
  const candidates = [
    cleaned,
    extractFencedJson(cleaned),
    extractFirstJsonObject(cleaned),
  ].filter((candidate): candidate is string => Boolean(candidate?.trim()));

  for (const candidate of candidates) {
    const parsed = parseJsonCandidate(candidate);
    const result = schema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
  }

  return undefined;
}

function stripMarkdownMarkers(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/\*\*/g, "")
    .trim();
}

function fallbackSummary(markdown: string): string {
  const lines = cleanText(markdown)
    .split("\n")
    .map(stripMarkdownMarkers)
    .filter((line) => line.length > 0);

  // Title-like lines tend to be short. Prefer the first substantive body line.
  const firstBodyLine =
    lines.find((line) => line.length > 20)
    ?? lines[1]
    ?? lines[0]
    ?? "Agent returned markdown without a structured summary.";

  return firstBodyLine.slice(0, 800);
}

function normalizeHeading(line: string): string | undefined {
  const match = line.match(/^#{1,6}\s+(.+?)\s*$/);
  return match?.[1]?.toLowerCase();
}

function sectionBullets(markdown: string, headingTerms: string[]): string[] {
  const lines = cleanText(markdown).split("\n");
  const headingIndex = lines.findIndex((line) => {
    const heading = normalizeHeading(line);
    return heading ? headingTerms.some((term) => heading.includes(term)) : false;
  });

  if (headingIndex < 0) {
    return [];
  }

  const bullets: string[] = [];
  for (const line of lines.slice(headingIndex + 1)) {
    if (normalizeHeading(line)) {
      break;
    }

    const bullet = line.match(/^\s*(?:[-*]|\d+\.)\s+(.+?)\s*$/)?.[1];
    if (bullet) {
      bullets.push(stripMarkdownMarkers(bullet));
    }
  }

  return bullets.slice(0, 5);
}

export function coerceAgentArtifactPayload(params: StructuredPayloadParams & { agentId: string }): AgentArtifactOutput {
  const objectResult = AgentArtifactOutputSchema.safeParse(params.object);
  if (objectResult.success) {
    return objectResult.data;
  }

  const textResult = parseStructuredJsonFromText(params.text, AgentArtifactOutputSchema);
  if (textResult) {
    return textResult;
  }

  const markdown = cleanText(params.text ?? "");
  if (!markdown) {
    throw new Error(`Agent ${params.agentId} returned no structured object or markdown text.`);
  }

  return {
    markdown,
    summary: fallbackSummary(markdown),
    assumptions: sectionBullets(markdown, ["assumption"]),
    risks: sectionBullets(markdown, ["risk"]),
    openQuestions: sectionBullets(markdown, ["open question", "questions before"]),
  };
}

export function coerceFinalPlanPayload(params: StructuredPayloadParams): FinalPlanOutput {
  const objectResult = FinalPlanOutputSchema.safeParse(params.object);
  if (objectResult.success) {
    return objectResult.data;
  }

  const textResult = parseStructuredJsonFromText(params.text, FinalPlanOutputSchema);
  if (textResult) {
    return textResult;
  }

  const markdown = cleanText(params.text ?? "");
  if (!markdown) {
    throw new Error("Final aggregator returned no structured object or markdown text.");
  }

  return { markdown };
}
