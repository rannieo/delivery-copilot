import { makeDeliveryStep } from "./_make-delivery-step";

export const qaEngineerStep = makeDeliveryStep({
  id: "qa-engineer-step",
  description: "Creates QA and testing plan.",
  agentId: "qa-engineer-agent",
  agentName: "qa_engineer",
  role: "QA Engineer Agent",
  artifactType: "qa_test_plan",
  instruction:
    "Create the QA Test Plan. Include functional scenarios, API tests, negative tests, edge cases, integration tests, security tests, regression checklist, test data requirements, and release readiness checklist.",
});
