import { createWorkflow } from "@mastra/core/workflows";
import {
  DeliveryWorkflowInputSchema,
  DeliveryWorkflowResultSchema,
} from "../shared/schema/delivery-schema";
import { productAnalystStep } from "./steps/product-analyst-step";
import { solutionArchitectStep } from "./steps/solution-architect-step";
import { securityStep } from "./steps/security-manager-step";
import { backendLeadStep } from "./steps/backend-lead-step";
import { qaEngineerStep } from "./steps/qa-engineer-step";
import { deliveryManagerStep } from "./steps/delivery-manager-step";
import { finalAggregatorStep } from "./steps/final-aggregator-step";
import { frontendLeadStep } from "./steps/frontend-lead-step";
import { mobileLeadStep } from "./steps/mobile-lead-step";
import { initializeWorkflowRunStep } from "./steps/initialize-workflow-run-step";
import { failWorkflowRunByMastraRunId } from "../../db/repositories/workflow-run-repository";

const FAILED_TERMINAL_STATUSES = new Set(["failed", "tripwire", "canceled", "bailed"]);

function stringifyError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (error === undefined || error === null) return fallback;
  return String(error);
}

export const deliveryCopilotWorkflow = createWorkflow({
  id: "delivery-copilot-workflow",
  description:
    "Runs the full Delivery Copilot pipeline from raw PRD input to final technical delivery plan.",
  inputSchema: DeliveryWorkflowInputSchema,
  outputSchema: DeliveryWorkflowResultSchema,

  options: {
    onError: async ({ runId, error }) => {
      await failWorkflowRunByMastraRunId({
        mastraRunId: runId,
        errorMessage: stringifyError(error, "Unknown workflow error"),
      });
    },

    onFinish: async ({ runId, status, error }) => {
      if (FAILED_TERMINAL_STATUSES.has(status)) {
        await failWorkflowRunByMastraRunId({
          mastraRunId: runId,
          errorMessage: stringifyError(error, `Workflow ended with status ${status}`),
        });
      }
    },
  },
})
  .then(initializeWorkflowRunStep)
  .then(productAnalystStep)
  .then(solutionArchitectStep)
  .then(securityStep)
  .then(backendLeadStep)
  .then(frontendLeadStep)
  .then(mobileLeadStep)
  .then(qaEngineerStep)
  .then(deliveryManagerStep)
  .then(finalAggregatorStep)
  .commit();
