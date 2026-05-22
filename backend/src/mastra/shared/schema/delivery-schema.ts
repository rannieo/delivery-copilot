import { z } from 'zod'
import { AgentNameSchema, type AgentName } from './agent-name-schema.ts';

export { AgentNameSchema, type AgentName };

const DeliveryArtifactSchema = z.object({
  agentName: AgentNameSchema,
  artifactType: z.string(),
  markdown: z.string(),
  summary: z.string(),
  assumptions: z.array(z.string()),
  risks: z.array(z.string()),
  openQuestions: z.array(z.string()),
});

export const DeliveryWorkflowInputSchema = z.object({
  projectName: z.string().min(1),
  projectDescription: z.string().optional(),
  rawInput: z.string().min(1),
  planTitle: z.string().optional(),
  useRag: z.boolean().default(true),
});

export const DeliveryWorkflowContextSchema = z.object({
  projectId: z.string(),
  workflowRunId: z.string(),
  rawInput: z.string(),
  planTitle: z.string().optional(),
  useRag: z.boolean().default(true),
  artifacts: z.array(DeliveryArtifactSchema),
});

export const DeliveryWorkflowResultSchema = z.object({
  projectId: z.string(),
  workflowRunId: z.string(),
  planTitle: z.string(),
  finalMarkdown: z.string(),
  artifacts: z.array(DeliveryArtifactSchema),
});

export type DeliveryArtifact = z.infer<typeof DeliveryArtifactSchema>;
export type DeliveryWorkflowContext = z.infer<typeof DeliveryWorkflowContextSchema>;
