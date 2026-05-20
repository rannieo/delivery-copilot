import { makeDeliveryStep } from "./_make-delivery-step";

export const securityStep = makeDeliveryStep({
  id: "security-step",
  description: "Reviews architecture and requirements for security risks.",
  agentId: "security-manager-agent",
  agentName: "security_manager",
  role: "Security Manager Agent",
  artifactType: "security_review_and_control_plan",
  instruction:
    "Create the Security Review and Control Plan. Include data classification, authentication, authorization, API security, input validation, sensitive data protection, AI/RAG security, file upload security if applicable, audit logging, abuse cases, security risks, and security acceptance criteria.",
});
