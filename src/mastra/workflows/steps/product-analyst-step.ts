import { createStep } from "@mastra/core/workflows";
import { DeliveryWorkflowContextSchema, DeliveryWorkflowInputSchema } from "../../shared/schema/delivery-schema";
import { buildAgentPrompt, buildArtifact, persistArtifact } from "../../helpers";

/**
 * Build the actual step for Product Analyst
 */
export const productAnalystStep = createStep({
  id: "product-analyst-step",
  description: "Extracts business requirements from raw project input.",
  inputSchema: DeliveryWorkflowContextSchema,
  outputSchema: DeliveryWorkflowContextSchema,

  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgentById("product-analyst-agent");

    const response = await agent.generate(
      buildAgentPrompt({
        role: "Product Analyst Agent",
        projectId: inputData.projectId,
        rawInput: inputData.rawInput,
        artifacts: [],
        specificInstruction:
          "Create the Product Requirements Analysis. Extract business goals, users, functional requirements, non-functional requirements, acceptance criteria, assumptions, and open questions.",
      }),
    );

    const artifact = buildArtifact({
      agentName: "product_analyst",
      artifactType: "product_requirements_analysis",
      markdown: response.text,
    });

    await persistArtifact({
      projectId: inputData.projectId,
      workflowRunId: inputData.workflowRunId,
      artifact,
    });

    return {
      ...inputData,
      artifacts: [artifact],
    };
  },
});