import { createStep } from "@mastra/core/workflows";
import { DeliveryWorkflowContextSchema, DeliveryWorkflowResultSchema } from "../../shared/schema/delivery-schema";
import { FinalPlanOutputSchema } from "../../shared/schema/agent-artifact-output-schema";
import { buildAgentPrompt, buildArtifact, persistArtifact } from "../../helpers";
import { finalPlanPath, runDir } from "../../shared/workspace-paths";
import { deliveryWorkflowModelSettings } from "../../config";
import { coerceFinalPlanPayload } from "../../helpers/structured-output";
import { saveFinalPlan } from "../../../db/repositories/final-plan-repository";
import { completeWorkflowRun } from "../../../db/repositories/workflow-run-repository";

export const finalAggregatorStep = createStep({
  id: "final-aggregator-step",
  description: "Combines all agent artifacts into one final technical delivery plan.",
  inputSchema: DeliveryWorkflowContextSchema,
  outputSchema: DeliveryWorkflowResultSchema,

  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgentById("final-plan-aggregator-agent");
    const planTitle = inputData.planTitle ?? "Technical Delivery Plan";

    const response = await agent.generate(
      buildAgentPrompt({
        role: "Final Plan Aggregator Agent",
        projectId: inputData.projectId,
        rawInput: inputData.rawInput,
        artifacts: inputData.artifacts,
        specificInstruction: `
Create one polished final Markdown document titled "${planTitle}".

The final document must include:
1. Executive Summary
2. Business Goals
3. Functional Requirements
4. Non-Functional Requirements
5. Proposed Architecture
6. Security Review and Controls
7. Backend Implementation Plan
8. Frontend Implementation Plan
9. Mobile Implementation Plan
10. API Design
11. Database Design
12. QA and Testing Plan
13. Delivery Roadmap
14. Engineering Tickets
15. Risks and Mitigations
16. Assumptions
17. Open Questions
18. Recommended Next Steps

Do not add unsupported requirements.
Preserve important risks, assumptions, and open questions.

Return a structured response matching the requested schema with a single "markdown" field containing the full final document.
`,
      }),
      {
        modelSettings: deliveryWorkflowModelSettings,
        toolChoice: "none",
        structuredOutput: {
          schema: FinalPlanOutputSchema,
          jsonPromptInjection: true,
          errorStrategy: "warn",
        },
      },
    );

    const payload = coerceFinalPlanPayload({
      object: response.object,
      text: response.text,
    });

    const finalMarkdown = payload.markdown;

    const artifact = buildArtifact({
      agentName: "final_aggregator",
      artifactType: "final_technical_delivery_plan",
      markdown: finalMarkdown,
    });

    await persistArtifact({
      projectId: inputData.projectId,
      workflowRunId: inputData.workflowRunId,
      artifact,
      mastra,
    });

    const workspace = mastra.getWorkspace();
    if (!workspace?.filesystem) {
      throw new Error("Workspace filesystem not configured");
    }

    const planPath = finalPlanPath(inputData.workflowRunId);
    await workspace.filesystem.mkdir(runDir(inputData.workflowRunId), { recursive: true });
    await workspace.filesystem.writeFile(planPath, finalMarkdown);

    await saveFinalPlan({
      projectId: inputData.projectId,
      workflowRunId: inputData.workflowRunId,
      title: planTitle,
      markdown: planPath,
    });

    await completeWorkflowRun({ workflowRunId: inputData.workflowRunId });

    return {
      projectId: inputData.projectId,
      workflowRunId: inputData.workflowRunId,
      planTitle,
      finalMarkdown,
      artifacts: [...inputData.artifacts, artifact],
    };
  },
});
