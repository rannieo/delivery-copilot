import { createTool } from "@mastra/core/tools";
import { z } from 'zod'
import { AgentNameSchema } from "../shared/schema/agent-name-schema";

/**
 * Temporary in-memory store for MVP.
 */
const projectStore = new Map<string, any>();

export const saveAgentOutputTool = createTool({
  id: "save-agent-output",
  description:
    "Saves an agent output as a project artifact so later agents can use it.",

  inputSchema: z.object({
    projectId: z.string(),
    agentName: AgentNameSchema,
    artifactType: z.string(),
    markdown: z.string(),
    summary: z.string(),
    assumptions: z.array(z.string()).default([]),
    risks: z.array(z.string()).default([]),
    openQuestions: z.array(z.string()).default([]),
  }),

  outputSchema: z.object({
    artifactId: z.string(),
    projectId: z.string(),
    agentName: AgentNameSchema,
    artifactType: z.string(),
    saved: z.boolean(),
    createdAt: z.string(),
  }),

  execute: async (inputData) => {
    const artifactId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const existing = projectStore.get(inputData.projectId) ?? {
      artifacts: [],
    };

    existing.artifacts.push({
      id: artifactId,
      ...inputData,
      createdAt,
    });

    projectStore.set(inputData.projectId, existing);

    return {
      artifactId,
      projectId: inputData.projectId,
      agentName: inputData.agentName,
      artifactType: inputData.artifactType,
      saved: true,
      createdAt,
    };
  },
});
