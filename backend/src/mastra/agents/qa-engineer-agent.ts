import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { qaEngineerPrompt } from '../shared/prompts/qa-engineer-prompt.ts';
import { defaultAgentModelConfig } from '../config/index.ts';
import { retrieveProjectContextTool } from '../tools/retrieve-project-context-tool.ts';

export const qaEngineerAgent = new Agent({
  id: 'qa-engineer-agent',
  name: 'QA Engineer Agent',
  description:
    "Creates functional, API, negative, integration, regression, and security test checklists.",
  instructions: `
${qaEngineerPrompt}

Tool usage rules:
- Use retrieveProjectContextTool to read Product Analyst, Security Agent, Backend Lead, and Architecture outputs.
- Do not create delivery tickets directly.
`,
  model: defaultAgentModelConfig,
  memory: new Memory(),
  tools: {
    retrieveProjectContextTool,
  },
});
