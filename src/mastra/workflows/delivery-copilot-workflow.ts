import { createWorkflow } from "@mastra/core/workflows";
import {
  DeliveryWorkflowInputSchema,
  DeliveryWorkflowResultSchema,
} from "../shared/schema/delivery-schema.ts";
import { productAnalystStep } from "./steps/product-analyst-step.ts";
import { solutionArchitectStep } from "./steps/solution-architect-step.ts";
import { securityStep } from "./steps/security-manager-step.ts";
import { uxLeadStep } from "./steps/ux-lead-step.ts";
import { backendLeadStep } from "./steps/backend-lead-step.ts";
import { qaEngineerStep } from "./steps/qa-engineer-step.ts";
import { deliveryManagerStep } from "./steps/delivery-manager-step.ts";
import { finalAggregatorStep } from "./steps/final-aggregator-step.ts";
import { frontendLeadStep } from "./steps/frontend-lead-step.ts";
import { mobileLeadStep } from "./steps/mobile-lead-step.ts";
import { initializeWorkflowRunStep } from "./steps/initialize-workflow-run-step.ts";
import {
  completeWorkflowRunByMastraRunId,
  failWorkflowRunByMastraRunId,
} from "../../db/repositories/workflow-run-repository.ts";

const FAILED_TERMINAL_STATUSES = new Set(["failed", "tripwire", "canceled", "bailed"]);

function stringifyError(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return fallback;
  }
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
      if (status === "success") {
        await completeWorkflowRunByMastraRunId({ mastraRunId: runId });
        return;
      }
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
  .then(uxLeadStep)
  .then(backendLeadStep)
  .then(frontendLeadStep)
  .then(mobileLeadStep)
  .then(qaEngineerStep)
  .then(deliveryManagerStep)
  .then(finalAggregatorStep)
  .commit();
