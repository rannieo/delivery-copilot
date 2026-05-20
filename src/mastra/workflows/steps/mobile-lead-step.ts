import { makeDeliveryStep } from "./_make-delivery-step.ts";

export const mobileLeadStep = makeDeliveryStep({
  id: "mobile-lead-step",
  description: "Creates mobile scope and mobile implementation plan.",
  agentId: "mobile-lead-agent",
  agentName: "mobile_lead",
  role: "Mobile Lead Agent",
  artifactType: "mobile_implementation_plan",
  instruction:
    "Create the Mobile Implementation Plan. Decide whether the project needs responsive web only, PWA, React Native, Flutter, native iOS/Android, or no mobile scope for MVP. Include mobile screens, API integration, auth/session handling, mobile security, offline/sync, push notifications, device capabilities, mobile UX states, accessibility, testing, release/deployment, risks, implementation sequence, and QA handoff.",
});
