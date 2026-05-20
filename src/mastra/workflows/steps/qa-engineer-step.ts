import { createStep } from "@mastra/core/workflows";
import { DeliveryWorkflowContextSchema } from "../../shared/schema/delivery-schema";
import { buildAgentPrompt, buildArtifact, persistArtifact } from "../../helpers";

export const qaEngineerStep = createStep({
  id: "qa-engineer-step",
  description: "Creates QA and testing plan.",
  inputSchema: DeliveryWorkflowContextSchema,
  outputSchema: DeliveryWorkflowContextSchema,

  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgentById("qa-engineer-agent");

    const response = await agent.generate(
      buildAgentPrompt({
        role: "QA Engineer Agent",
        projectId: inputData.projectId,
        rawInput: inputData.rawInput,
        artifacts: inputData.artifacts,
        specificInstruction:
          "Create the QA Test Plan. Include functional scenarios, API tests, negative tests, edge cases, integration tests, security tests, regression checklist, test data requirements, and release readiness checklist.",
      }),
    );

    const artifact = buildArtifact({
      agentName: "qa_engineer",
      artifactType: "qa_test_plan",
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