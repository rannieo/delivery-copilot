import { createStep } from "@mastra/core/workflows";
import { DeliveryWorkflowContextSchema } from "../../shared/schema/delivery-schema";
import type { AgentName } from "../../shared/schema/delivery-schema";
import { AgentArtifactOutputSchema } from "../../shared/schema/agent-artifact-output-schema";
import { buildAgentPrompt, buildArtifact, persistArtifact } from "../../helpers";
import { deliveryWorkflowModelSettings } from "../../config";
import { coerceAgentArtifactPayload } from "../../helpers/structured-output";

const STRUCTURED_OUTPUT_ADDENDUM = `

Return a structured response matching the requested schema:
- "markdown": the full artifact as a single Markdown document with every section required above.
- "summary": a 2-4 sentence executive summary in plain prose (no markdown).
- "assumptions": array of concrete single-sentence strings; [] if none.
- "risks": array of concrete single-sentence strings; [] if none.
- "openQuestions": array of concrete stakeholder-answerable single-sentence strings; [] if none.
`;

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
          specificInstruction: opts.instruction + STRUCTURED_OUTPUT_ADDENDUM,
        }),
        {
          modelSettings: deliveryWorkflowModelSettings,
          toolChoice: "none",
          structuredOutput: {
            schema: AgentArtifactOutputSchema,
            jsonPromptInjection: true,
            errorStrategy: "warn",
          },
        },
      );

      const payload = coerceAgentArtifactPayload({
        agentId: opts.agentId,
        object: response.object,
        text: response.text,
      });

      const artifact = buildArtifact({
        agentName: opts.agentName,
        artifactType: opts.artifactType,
        markdown: payload.markdown,
        summary: payload.summary,
        assumptions: payload.assumptions,
        risks: payload.risks,
        openQuestions: payload.openQuestions,
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
