import { makeDeliveryStep } from "./_make-delivery-step.ts";

export const backendLeadStep = makeDeliveryStep({
  id: "backend-lead-step",
  description: "Creates backend implementation plan.",
  agentId: "backend-lead-agent",
  agentName: "backend_lead",
  role: "Backend Lead Agent",
  artifactType: "backend_implementation_plan",
  instruction:
    "Create the Backend Implementation Plan. Include modules/services, API endpoints, database design, background jobs, validation rules, security controls from the Security Agent, observability, error handling, implementation sequence, and backend risks.",
});
