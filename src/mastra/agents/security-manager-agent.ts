import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { securityManagerPrompt } from '../shared/prompts/security-manager-prompt';
import { defaultAgentModelConfig } from '../config';
import { retrieveProjectContextTool } from '../tools/retrieve-project-context-tool';
import { securityChecklistTool } from '../tools/security-checklist-tool';

export const securityManagerAgent = new Agent({
  id: 'security-manager-agent',
  name: 'Security Manager Agent',
  description:
    "Reviews requirements and architecture for security risks, access control, API security, data protection, audit logging, and AI/RAG threats.",
  instructions: `
${securityManagerPrompt}

Tool usage rules:
- Use retrieveProjectContextTool to read Product Analyst and Solution Architect outputs.
- Use securityChecklistTool to generate baseline security controls when project features are known.
- Do not create implementation tickets directly.
`,
  model: defaultAgentModelConfig,
  memory: new Memory(),
  tools: {
    retrieveProjectContextTool,
    securityChecklistTool,
  },
});
