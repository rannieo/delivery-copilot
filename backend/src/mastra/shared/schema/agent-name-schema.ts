import { z } from "zod";

export const AgentNameSchema = z.enum([
  "product_analyst",
  "solution_architect",
  "security_manager",
  "ux_lead",
  "backend_lead",
  "platform_lead",
  "qa_engineer",
  "delivery_manager",
  "final_aggregator",
  "frontend_lead",
  "mobile_lead",
]);

export type AgentName = z.infer<typeof AgentNameSchema>;
