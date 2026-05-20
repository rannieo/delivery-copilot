import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { securityManagerPrompt } from '../shared/prompts/security-manager-prompt';
import { retrieveProjectContextTool } from '../tools/retrieve-project-context-tool';
import { securityChecklistTool } from '../tools/security-checklist-tool';
import { saveAgentOutputTool } from '../tools/save-agent-output-tool';

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
- Use saveAgentOutputTool after producing the final Security Review and Control Plan.
- Do not create implementation tickets directly.
`,
  model: 'ollama-cloud/qwen3.5:397b',
  memory: new Memory(),
  tools: {
    retrieveProjectContextTool,
    securityChecklistTool,
    saveAgentOutputTool,
  },
});
