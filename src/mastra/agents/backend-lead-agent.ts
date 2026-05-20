import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { backendLeadPrompt } from '../shared/prompts/backend-lead-prompt';
import { defaultAgentModelConfig } from '../config';
import { retrieveProjectContextTool } from '../tools/retrieve-project-context-tool';

export const backendLeadAgent = new Agent({
  id: 'backend-lead-agent',
  name: 'Backend Lead Agent',
  description:
    "Designs backend modules, APIs, database changes, services, jobs, validation rules, audit logs, and implementation sequence.",
  instructions: `
${backendLeadPrompt}

Tool usage rules:
- Use retrieveProjectContextTool to read Product Analyst, Solution Architect, and Security Agent outputs.
- Security Agent output is mandatory context.
- If a security recommendation is not implemented, list it under "Deferred Security Controls" with a reason.
- Do not create delivery tickets directly.
`,
  model: defaultAgentModelConfig,
  memory: new Memory(),
  tools: {
    retrieveProjectContextTool,
  },
});
