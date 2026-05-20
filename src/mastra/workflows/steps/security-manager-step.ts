import { createStep } from "@mastra/core/workflows";
import { DeliveryWorkflowContextSchema } from "../../shared/schema/delivery-schema";
import { buildAgentPrompt, buildArtifact, persistArtifact } from "../../helpers";

export const securityStep = createStep({
  id: "security-step",
  description: "Reviews architecture and requirements for security risks.",
  inputSchema: DeliveryWorkflowContextSchema,
  outputSchema: DeliveryWorkflowContextSchema,

  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgentById("security-manager-agent");

    const response = await agent.generate(
      buildAgentPrompt({
        role: "Security Manager Agent",
        projectId: inputData.projectId,
        rawInput: inputData.rawInput,
        artifacts: inputData.artifacts,
        specificInstruction:
          "Create the Security Review and Control Plan. Include data classification, authentication, authorization, API security, input validation, sensitive data protection, AI/RAG security, file upload security if applicable, audit logging, abuse cases, security risks, and security acceptance criteria.",
      }),
    );

    const artifact = buildArtifact({
      agentName: "security_manager",
      artifactType: "security_review_and_control_plan",
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
