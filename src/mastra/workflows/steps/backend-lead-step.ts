import { createStep } from "@mastra/core/workflows";
import { DeliveryWorkflowContextSchema } from "../../shared/schema/delivery-schema";
import { buildAgentPrompt, buildArtifact, persistArtifact } from "../../helpers";

export const backendLeadStep = createStep({
  id: "backend-lead-step",
  description: "Creates backend implementation plan.",
  inputSchema: DeliveryWorkflowContextSchema,
  outputSchema: DeliveryWorkflowContextSchema,

  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgentById("backend-lead-agent");

    const response = await agent.generate(
      buildAgentPrompt({
        role: "Backend Lead Agent",
        projectId: inputData.projectId,
        rawInput: inputData.rawInput,
        artifacts: inputData.artifacts,
        specificInstruction:
          "Create the Backend Implementation Plan. Include modules/services, API endpoints, database design, background jobs, validation rules, security controls from the Security Agent, observability, error handling, implementation sequence, and backend risks.",
      }),
    );

    const artifact = buildArtifact({
      agentName: "backend_lead",
      artifactType: "backend_implementation_plan",
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