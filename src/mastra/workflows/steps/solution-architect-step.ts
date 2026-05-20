import { createStep } from "@mastra/core/workflows";
import { DeliveryWorkflowContextSchema } from "../../shared/schema/delivery-schema";
import { buildAgentPrompt, buildArtifact } from "../../helpers";

/**
 * Build the actual step for Product Analyst
 */
export const solutionArchitectStep = createStep({
  id: "solution-architect-step",
  description: "Creates architecture proposal based on product analysis.",
  inputSchema: DeliveryWorkflowContextSchema,
  outputSchema: DeliveryWorkflowContextSchema,

  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgentById("solution-architect-agent");

    const response = await agent.generate(
      buildAgentPrompt({
        role: "Solution Architect Agent",
        projectId: inputData.projectId,
        rawInput: inputData.rawInput,
        artifacts: inputData.artifacts,
        specificInstruction:
          "Create the Solution Architecture Proposal. Include architecture style, system components, data flow, integrations, security considerations, scalability, reliability, risks, tradeoffs, and ADR candidates.",
      }),
    );

    const artifact = buildArtifact({
      agentName: "solution_architect",
      artifactType: "solution_architecture_proposal",
      markdown: response.text,
    });

    return {
      ...inputData,
      artifacts: [...inputData.artifacts, artifact],
    };
  },
});