import { makeDeliveryStep } from "./_make-delivery-step";

export const frontendLeadStep = makeDeliveryStep({
  id: "frontend-lead-step",
  description: "Creates web frontend implementation plan.",
  agentId: "frontend-lead-agent",
  agentName: "frontend_lead",
  role: "Frontend Lead Agent",
  artifactType: "frontend_implementation_plan",
  instruction:
    "Create the Frontend Implementation Plan. Include web pages, routes, components, state management, API integration, forms, validation, loading states, empty states, success states, error states, permission UI, AI generation UX if applicable, accessibility, responsive web behavior, frontend testing plan, risks, implementation sequence, and handoff summary for Mobile Lead and QA.",
});
