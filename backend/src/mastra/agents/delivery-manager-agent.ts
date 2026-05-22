import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { deliveryManagerPrompt } from '../shared/prompts/delivery-manager-prompt.ts';
import { defaultAgentModelConfig } from '../config/index.ts';
import { retrieveProjectContextTool } from '../tools/retrieve-project-context-tool.ts';

export const deliverManagerAgent = new Agent({
  id: 'delivery-manager-agent',
  name: 'Delivery Manager Agent',
  description:
    "Breaks the work into milestones, phases, epics, stories, tasks, dependencies, estimates, and release checklist.",
  instructions: `
${deliveryManagerPrompt}

Tool usage rules:
- Use retrieveProjectContextTool to read all previous agent outputs.
- Keep tickets small, executable, and dependency-aware.
`,
  model: defaultAgentModelConfig,
  memory: new Memory(),
  tools: {
    retrieveProjectContextTool,
  },
});
