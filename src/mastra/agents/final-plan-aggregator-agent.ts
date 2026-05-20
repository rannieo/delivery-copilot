import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { finalPlanAggregatorPrompt } from '../shared/prompts/final-plan-aggregator-prompt';
import { defaultAgentModelConfig } from '../config';
import { retrieveProjectContextTool } from '../tools/retrieve-project-context-tool';
import { generateMarkdownPlanTool } from '../tools/generate-markdown-plan-tool';
import { exportMarkdownTool } from '../tools/export-markdown-tool';

export const finalPlanAggregatorAgent = new Agent({
  id: 'final-plan-aggregator-agent',
  name: 'Final Plan Aggregator Agent',
  description:
    "Combines all agent outputs into one polished technical delivery plan and prepares markdown export.",
  instructions: `
${finalPlanAggregatorPrompt}

Tool usage rules:
- Use retrieveProjectContextTool to read outputs from all agents.
- Use generateMarkdownPlanTool to create the final Markdown document.
- Use exportMarkdownTool only after the final Markdown plan is generated.
- Do not introduce new requirements that are not supported by previous agent outputs.
`,
  model: defaultAgentModelConfig,
  memory: new Memory(),
  tools: {
    retrieveProjectContextTool,
    generateMarkdownPlanTool,
    exportMarkdownTool,
  },
});
