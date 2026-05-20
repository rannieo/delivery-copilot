import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { qaEngineerPrompt } from '../shared/prompts/qa-engineer-prompt';
import { defaultAgentModelConfig } from '../config';
import { retrieveProjectContextTool } from '../tools/retrieve-project-context-tool';
import { securityChecklistTool } from '../tools/security-checklist-tool';
import { saveAgentOutputTool } from '../tools/save-agent-output-tool';

export const qaEngineerAgent = new Agent({
  id: 'qa-engineer-agent',
  name: 'QA Engineer Agent',
  description:
    "Creates functional, API, negative, integration, regression, and security test checklists.",
  instructions: `
${qaEngineerPrompt}

Tool usage rules:
- Use retrieveProjectContextTool to read Product Analyst, Security Agent, Backend Lead, and Architecture outputs.
- Use securityChecklistTool when security requirements need to be converted into test coverage.
- Use saveAgentOutputTool after producing the final QA Test Plan.
- Do not create delivery tickets directly.
`,
  model: defaultAgentModelConfig,
  memory: new Memory(),
  tools: {
    retrieveProjectContextTool,
    securityChecklistTool,
    saveAgentOutputTool,
  },
});
