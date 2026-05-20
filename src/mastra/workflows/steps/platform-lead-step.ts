import { makeDeliveryStep } from "./_make-delivery-step.ts";

export const platformLeadStep = makeDeliveryStep({
  id: "platform-lead-step",
  description:
    "Creates the platform implementation plan: hosting, CI/CD, environments, secrets, observability, SLO/SLI, DR, runbooks, on-call, cost.",
  agentId: "platform-lead-agent",
  agentName: "platform_lead",
  role: "Platform Lead Agent",
  artifactType: "platform_implementation_plan",
  instruction:
    "Create the Platform Implementation Plan. Name specific tools (hosting target, CI/CD platform, secrets manager, observability stack, IaC tool) — never 'use a managed service' or 'use the cloud'. Cite a concrete principle for each choice (12-factor by number, SLO/SLI/error budget, blue-green/canary/rolling with traffic split %, DORA metrics, RTO/RPO targets, Conway's Law) or a concrete constraint from prior agent outputs. Right-size: justify each infra choice against team size + scale + budget; do not propose Kubernetes for a small CRUD MVP. Runbooks are limited to the top 3 actual failure scenarios drawn from Backend Risks + Security Abuse cases — no generic runbooks. Cost notes are required (one-line monthly estimate per major component). Forbidden vague terms: modern, cloud-native, scalable, robust, enterprise-grade, production-ready, battle-tested, best-of-breed, future-proof, highly available, world-class, industry-leading.",
});
