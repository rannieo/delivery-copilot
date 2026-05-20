import { createStep } from "@mastra/core/workflows";
import { DeliveryWorkflowContextSchema } from "../../shared/schema/delivery-schema";
import { buildAgentPrompt, buildArtifact, persistArtifact } from "../../helpers";

export const deliveryManagerStep = createStep({
  id: "delivery-manager-step",
  description: "Creates delivery roadmap, milestones, and tickets.",
  inputSchema: DeliveryWorkflowContextSchema,
  outputSchema: DeliveryWorkflowContextSchema,

  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgentById("delivery-manager-agent");

    const response = await agent.generate(
      buildAgentPrompt({
        role: "Delivery Manager Agent",
        projectId: inputData.projectId,
        rawInput: inputData.rawInput,
        artifacts: inputData.artifacts,
        specificInstruction:
          "Create the Delivery Roadmap. Include delivery strategy, milestones, phases, epics, stories, tasks, dependencies, estimates, team plan, risk register, and release checklist.",
      }),
    );

    const artifact = buildArtifact({
      agentName: "delivery_manager",
      artifactType: "delivery_roadmap",
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
