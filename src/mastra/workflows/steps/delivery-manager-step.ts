import { makeDeliveryStep } from "./_make-delivery-step.ts";

export const deliveryManagerStep = makeDeliveryStep({
  id: "delivery-manager-step",
  description: "Creates delivery roadmap, milestones, and tickets.",
  agentId: "delivery-manager-agent",
  agentName: "delivery_manager",
  role: "Delivery Manager Agent",
  artifactType: "delivery_roadmap",
  instruction:
    "Create the Delivery Roadmap. Include delivery strategy, milestones, phases, epics, stories, tasks, dependencies, estimates, team plan, risk register, and release checklist.",
});
