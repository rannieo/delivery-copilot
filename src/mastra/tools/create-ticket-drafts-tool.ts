import { createTool } from "@mastra/core/tools";
import { z } from 'zod'

export const createTicketDraftsTool = createTool({
  id: "create-ticket-drafts",
  description:
    "Converts a delivery plan into Jira-style engineering ticket drafts.",

  inputSchema: z.object({
    projectId: z.string(),
    deliveryPlanMarkdown: z.string(),
  }),

  outputSchema: z.object({
    projectId: z.string(),
    tickets: z.array(
      z.object({
        title: z.string(),
        type: z.enum(["epic", "story", "task", "bug", "spike"]),
        priority: z.enum(["high", "medium", "low"]),
        ownerRole: z.enum([
          "backend",
          "frontend",
          "qa",
          "devops",
          "product",
          "design",
        ]),
        description: z.string(),
        acceptanceCriteria: z.array(z.string()),
        dependencies: z.array(z.string()),
        estimate: z.enum(["XS", "S", "M", "L", "XL"]),
      }),
    ),
  }),

  execute: async (inputData) => {
    return {
      projectId: inputData.projectId,
      tickets: [
        {
          title: "Set up project foundation",
          type: "task" as const,
          priority: "high" as const,
          ownerRole: "backend" as const,
          description:
            "Set up the backend structure, environment configuration, and initial project modules.",
          acceptanceCriteria: [
            "Project runs locally",
            "Environment variables are documented",
            "Basic health check endpoint exists",
          ],
          dependencies: [],
          estimate: "M" as const,
        },
        {
          title: "Implement core API endpoints",
          type: "story" as const,
          priority: "high" as const,
          ownerRole: "backend" as const,
          description:
            "Implement the core backend endpoints identified in the delivery plan.",
          acceptanceCriteria: [
            "Endpoints follow the approved API design",
            "Validation is implemented",
            "Authorization checks are applied",
          ],
          dependencies: ["Set up project foundation"],
          estimate: "L" as const,
        },
        {
          title: "Prepare QA regression checklist",
          type: "task" as const,
          priority: "medium" as const,
          ownerRole: "qa" as const,
          description:
            "Create a regression checklist based on the generated QA plan.",
          acceptanceCriteria: [
            "Happy path cases are covered",
            "Negative test cases are covered",
            "Security-related test cases are included",
          ],
          dependencies: ["Implement core API endpoints"],
          estimate: "S" as const,
        },
      ],
    };
  },
});