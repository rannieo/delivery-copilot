import { createStep } from "@mastra/core/workflows";
import { DeliveryWorkflowContextSchema, DeliveryWorkflowResultSchema } from "../../shared/schema/delivery-schema.ts";
import { FinalPlanOutputSchema } from "../../shared/schema/agent-artifact-output-schema.ts";
import { buildAgentPrompt } from "../../helpers/index.ts";
import { finalPlanPath, runDir } from "../../shared/workspace-paths.ts";
import { deliveryWorkflowModelSettings } from "../../config/index.ts";
import { coerceFinalPlanPayload } from "../../helpers/structured-output.ts";
import { saveFinalPlan } from "../../../db/repositories/final-plan-repository.ts";
import { retrieveProjectContextForPrompt } from "../../rag/retrieval-service.ts";
import { buildAgentRetrievalQuery } from "../../rag/workflow-retrieval.ts";

export const finalAggregatorStep = createStep({
  id: "final-aggregator-step",
  description: "Combines all agent artifacts into one final technical delivery plan.",
  inputSchema: DeliveryWorkflowContextSchema,
  outputSchema: DeliveryWorkflowResultSchema,

  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgentById("final-plan-aggregator-agent");
    const planTitle = inputData.planTitle ?? "Technical Delivery Plan";
    const retrievedContext =
      inputData.useRag === false
        ? "No retrieved project context."
        : await retrieveProjectContextForPrompt({
            projectId: inputData.projectId,
            topK: 10,
            query: buildAgentRetrievalQuery({
              role: "Final Plan Aggregator Agent",
              rawInput: inputData.rawInput,
              artifactSummaries: inputData.artifacts.map((artifact) => artifact.summary),
            }),
          });

    const response = await agent.generate(
      buildAgentPrompt({
        role: "Final Plan Aggregator Agent",
        projectId: inputData.projectId,
        rawInput: inputData.rawInput,
        artifacts: inputData.artifacts,
        retrievedContext,
        specificInstruction: `
Create one polished final Markdown document titled "${planTitle}".

The final document must include:
1. Executive Summary
2. Business Goals
3. Functional Requirements
4. Non-Functional Requirements
5. Proposed Architecture
6. Security Review and Controls
7. UI/UX Design
8. Backend Implementation Plan
9. Frontend Implementation Plan
10. Mobile Implementation Plan
11. Platform Implementation Plan
12. API Design
13. Database Design
14. QA and Testing Plan
15. Delivery Roadmap
16. Engineering Tickets
17. Risks and Mitigations
18. Assumptions
19. Open Questions
20. Recommended Next Steps

Do not add unsupported requirements.
Preserve important risks, assumptions, and open questions.
In Section 7 (UI/UX Design), preserve the UX Lead's principle citations, chosen design-system library name + license, and per-screen WCAG criteria verbatim. Do not summarize them into adjectives.
In Section 11 (Platform Implementation Plan), preserve the Platform Lead's named hosting target, CI/CD platform, secrets manager, observability stack, SLO/SLI targets, backup/DR posture, runbooks, on-call basics, and cost notes. Do not replace specific tool names with generic labels.

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

    return {
      projectId: inputData.projectId,
      workflowRunId: inputData.workflowRunId,
      planTitle,
      finalMarkdown,
      artifacts: inputData.artifacts,
    };
  },
});
