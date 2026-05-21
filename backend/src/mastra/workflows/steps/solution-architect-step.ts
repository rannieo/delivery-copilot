import { makeDeliveryStep } from "./_make-delivery-step.ts";

export const solutionArchitectStep = makeDeliveryStep({
  id: "solution-architect-step",
  description: "Creates architecture proposal based on product analysis.",
  agentId: "solution-architect-agent",
  agentName: "solution_architect",
  role: "Solution Architect Agent",
  artifactType: "solution_architecture_proposal",
  instruction:
    "Create the Solution Architecture Proposal. Include architecture style, system components, data flow, integrations, security considerations, scalability, reliability, risks, tradeoffs, and ADR candidates.",
});
