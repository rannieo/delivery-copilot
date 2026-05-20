import { makeDeliveryStep } from "./_make-delivery-step.ts";

export const productAnalystStep = makeDeliveryStep({
  id: "product-analyst-step",
  description: "Extracts business requirements from raw project input.",
  agentId: "product-analyst-agent",
  agentName: "product_analyst",
  role: "Product Analyst Agent",
  artifactType: "product_requirements_analysis",
  instruction:
    "Create the Product Requirements Analysis. Extract business goals, users, functional requirements, non-functional requirements, acceptance criteria, assumptions, and open questions.",
});
