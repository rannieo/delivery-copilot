import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { deliveryManagerPrompt } from '../shared/prompts/delivery-manager-prompt';
import { defaultAgentModelConfig } from '../config';
import { retrieveProjectContextTool } from '../tools/retrieve-project-context-tool';
import { createTicketDraftsTool } from '../tools/create-ticket-drafts-tool';
import { saveAgentOutputTool } from '../tools/save-agent-output-tool';

export const deliverManagerAgent = new Agent({
  id: 'delivery-manager-agent',
  name: 'Delivery Manager Agent',
  description:
    "Breaks the work into milestones, phases, epics, stories, tasks, dependencies, estimates, and release checklist.",
  instructions: `
${deliveryManagerPrompt}

Tool usage rules:
- Use retrieveProjectContextTool to read all previous agent outputs.
- Use createTicketDraftsTool when creating Jira-style ticket drafts.
- Use saveAgentOutputTool after producing the final Delivery Roadmap.
- Keep tickets small, executable, and dependency-aware.
`,
  model: defaultAgentModelConfig,
  memory: new Memory(),
  tools: {
    retrieveProjectContextTool,
    createTicketDraftsTool,
    saveAgentOutputTool,
  },
});
