import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { AgentNameSchema } from "../shared/schema/agent-name-schema";
import { listLatestArtifactsByProject } from "../../db/repositories/artifact-repository";

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

  execute: async (inputData, context) => {
    const workspace = context?.mastra?.getWorkspace();
    if (!workspace?.filesystem) {
      throw new Error("Workspace filesystem not configured");
    }

    const rows = await listLatestArtifactsByProject({
      projectId: inputData.projectId,
    });

    const filtered = inputData.includeAgents
      ? rows.filter((row) =>
          inputData.includeAgents!.includes(
            row.agentName as (typeof inputData.includeAgents)[number],
          ),
        )
      : rows;

    const artifacts = await Promise.all(
      filtered.map(async (row) => {
        const markdown = await workspace.filesystem!.readFile(row.markdown);
        return {
          artifactId: row.id,
          agentName: row.agentName as z.infer<typeof AgentNameSchema>,
          artifactType: row.artifactType,
          summary: row.summary,
          markdown: typeof markdown === "string" ? markdown : markdown.toString("utf-8"),
          assumptions: row.assumptions ?? [],
          risks: row.risks ?? [],
          openQuestions: row.openQuestions ?? [],
          createdAt: row.createdAt.toISOString(),
        };
      }),
    );

    return {
      projectId: inputData.projectId,
      currentAgent: inputData.currentAgent,
      artifacts,
    };
  },
});
