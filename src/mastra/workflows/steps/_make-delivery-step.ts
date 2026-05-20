import { createStep } from "@mastra/core/workflows";
import { DeliveryWorkflowContextSchema } from "../../shared/schema/delivery-schema";
import type { AgentName } from "../../shared/schema/delivery-schema";
import { buildAgentPrompt, buildArtifact, persistArtifact } from "../../helpers";

export function makeDeliveryStep(opts: {
  id: string;
  description: string;
  agentId: string;
  agentName: AgentName;
  role: string;
  artifactType: string;
  instruction: string;
}) {
  return createStep({
    id: opts.id,
    description: opts.description,
    inputSchema: DeliveryWorkflowContextSchema,
    outputSchema: DeliveryWorkflowContextSchema,

    execute: async ({ inputData, mastra }) => {
      const agent = mastra.getAgentById(opts.agentId);

      const response = await agent.generate(
        buildAgentPrompt({
          role: opts.role,
          projectId: inputData.projectId,
          rawInput: inputData.rawInput,
          artifacts: inputData.artifacts,
          specificInstruction: opts.instruction,
        }),
      );

      const artifact = buildArtifact({
        agentName: opts.agentName,
        artifactType: opts.artifactType,
        markdown: response.text,
      });

      await persistArtifact({
        projectId: inputData.projectId,
        workflowRunId: inputData.workflowRunId,
        artifact,
        mastra,
      });

      return {
        ...inputData,
        artifacts: [...inputData.artifacts, artifact],
      };
    },
  });
}
