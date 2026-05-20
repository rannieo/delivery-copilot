import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const parseProjectInputTool = createTool({
  id: "parse-project-input",
  description:
    "Normalizes raw PRD, meeting notes, or feature request into structured project input.",

  inputSchema: z.object({
    projectId: z.string(),
    rawInput: z.string().min(1),
  }),

  outputSchema: z.object({
    projectId: z.string(),
    projectName: z.string().optional(),
    rawInput: z.string(),
    possibleRequirements: z.array(z.string()),
    possibleConstraints: z.array(z.string()),
    possibleActors: z.array(z.string()),
    possibleSystems: z.array(z.string()),
    unclearStatements: z.array(z.string()),
  }),

  execute: async (inputData) => {
    const { projectId, rawInput } = inputData;

    const lines = rawInput
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const possibleRequirements = lines.filter((line) =>
      /must|should|need|required|allow|enable|support|user can|system can/i.test(
        line,
      ),
    );

    const possibleConstraints = lines.filter((line) =>
      /deadline|budget|constraint|limited|must use|cannot|compliance|security/i.test(
        line,
      ),
    );

    const possibleActors = lines.filter((line) =>
      /admin|user|customer|staff|manager|agent|developer|qa|operator/i.test(
        line,
      ),
    );

    const possibleSystems = lines.filter((line) =>
      /api|database|service|integration|webhook|queue|email|sms|payment|auth/i.test(
        line,
      ),
    );

    const unclearStatements = lines.filter((line) =>
      /maybe|probably|not sure|tbd|to follow|unclear|later/i.test(line),
    );

    return {
      projectId,
      projectName: undefined,
      rawInput,
      possibleRequirements,
      possibleConstraints,
      possibleActors,
      possibleSystems,
      unclearStatements,
    };
  },
});