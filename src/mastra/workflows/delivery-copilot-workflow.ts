import { createWorkflow } from "@mastra/core/workflows";
import { DeliveryWorkflowInputSchema, DeliveryWorkflowResultSchema } from "../shared/schema/delivery-schema";
import { productAnalystStep } from "./steps/product-analyst-step";
import { solutionArchitectStep } from "./steps/solution-architect-step";
import { securityStep } from "./steps/security-manager-step";
import { backendLeadStep } from "./steps/backend-lead-step";
import { qaEngineerStep } from "./steps/qa-engineer-step";
import { deliveryManagerStep } from "./steps/delivery-manager-step";
import { finalAggregatorStep } from "./steps/final-aggregator-step";
import { frontendLeadStep } from "./steps/frontend-lead-step";
import { mobileLeadStep } from "./steps/mobile-lead-step";


/**
 * Main Delivery Copilot Workflow
 */
export const deliveryCopilotWorkflow = createWorkflow({
  id: "delivery-copilot-workflow",
  description:
    "Runs the full Delivery Copilot pipeline from raw PRD input to final technical delivery plan.",
  inputSchema: DeliveryWorkflowInputSchema,
  outputSchema: DeliveryWorkflowResultSchema,
})
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