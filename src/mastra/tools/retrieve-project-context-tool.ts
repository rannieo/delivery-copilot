import { createTool } from "@mastra/core/tools";
import { z } from 'zod'
import { AgentNameSchema } from "../shared/schema/agent-name-schema";
import { projectStore } from "../shared/store/project-store";

export const retrieveProjectContextTool = createTool({
  id: "retrieve-project-context",
  description:
    "Retrieves previous agent outputs and project artifacts relevant to the current agent.",

  inputSchema: z.object({
    projectId: z.string(),
    currentAgent: AgentNameSchema,
    includeAgents: z.array(AgentNameSchema).optional(),
  }),

  outputSchema: z.object({
    projectId: z.string(),
    currentAgent: AgentNameSchema,
    artifacts: z.array(
      z.object({
        artifactId: z.string(),
        agentName: AgentNameSchema,
        artifactType: z.string(),
        summary: z.string(),
        markdown: z.string(),
        assumptions: z.array(z.string()),
        risks: z.array(z.string()),
        openQuestions: z.array(z.string()),
        createdAt: z.string(),
      }),
    ),
  }),

  execute: async (inputData) => {
    const project = projectStore.get(inputData.projectId);

    const artifacts = project?.artifacts ?? [];

    const filteredArtifacts = inputData.includeAgents
      ? artifacts.filter((artifact: any) =>
          inputData.includeAgents?.includes(artifact.agentName),
        )
      : artifacts;

    return {
      projectId: inputData.projectId,
      currentAgent: inputData.currentAgent,
      artifacts: filteredArtifacts.map((artifact: any) => ({
        artifactId: artifact.id,
        agentName: artifact.agentName,
        artifactType: artifact.artifactType,
        summary: artifact.summary,
        markdown: artifact.markdown,
        assumptions: artifact.assumptions ?? [],
        risks: artifact.risks ?? [],
        openQuestions: artifact.openQuestions ?? [],
        createdAt: artifact.createdAt,
      })),
    };
  },
});