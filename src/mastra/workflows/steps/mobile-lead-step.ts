import { createStep } from "@mastra/core/workflows";
import { DeliveryWorkflowContextSchema } from "../../shared/schema/delivery-schema";
import { buildAgentPrompt, buildArtifact, persistArtifact } from "../../helpers";

export const mobileLeadStep = createStep({
  id: "mobile-lead-step",
  description: "Creates mobile scope and mobile implementation plan.",
  inputSchema: DeliveryWorkflowContextSchema,
  outputSchema: DeliveryWorkflowContextSchema,

  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgentById("mobile-lead-agent");

    const response = await agent.generate(
      buildAgentPrompt({
        role: "Mobile Lead Agent",
        projectId: inputData.projectId,
        rawInput: inputData.rawInput,
        artifacts: inputData.artifacts,
        specificInstruction:
          "Create the Mobile Implementation Plan. Decide whether the project needs responsive web only, PWA, React Native, Flutter, native iOS/Android, or no mobile scope for MVP. Include mobile screens, API integration, auth/session handling, mobile security, offline/sync, push notifications, device capabilities, mobile UX states, accessibility, testing, release/deployment, risks, implementation sequence, and QA handoff.",
      }),
    );

    const artifact = buildArtifact({
      agentName: "mobile_lead",
      artifactType: "mobile_implementation_plan",
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