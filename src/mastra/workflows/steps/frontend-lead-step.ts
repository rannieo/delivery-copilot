import { createStep } from "@mastra/core/workflows";
import { DeliveryWorkflowContextSchema } from "../../shared/schema/delivery-schema";
import { buildAgentPrompt, buildArtifact, persistArtifact } from "../../helpers";

export const frontendLeadStep = createStep({
  id: "frontend-lead-step",
  description: "Creates web frontend implementation plan.",
  inputSchema: DeliveryWorkflowContextSchema,
  outputSchema: DeliveryWorkflowContextSchema,

  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgentById("frontend-lead-agent");

    const response = await agent.generate(
      buildAgentPrompt({
        role: "Frontend Lead Agent",
        projectId: inputData.projectId,
        rawInput: inputData.rawInput,
        artifacts: inputData.artifacts,
        specificInstruction:
          "Create the Frontend Implementation Plan. Include web pages, routes, components, state management, API integration, forms, validation, loading states, empty states, success states, error states, permission UI, AI generation UX if applicable, accessibility, responsive web behavior, frontend testing plan, risks, implementation sequence, and handoff summary for Mobile Lead and QA.",
      }),
    );

    const artifact = buildArtifact({
      agentName: "frontend_lead",
      artifactType: "frontend_implementation_plan",
      markdown: response.text,
    });

    await persistArtifact({
      projectId: inputData.projectId,
      workflowRunId: inputData.workflowRunId,
      artifact,
    });

    return {
      ...inputData,
      artifacts: [...inputData.artifacts, artifact],
    };
  },
});