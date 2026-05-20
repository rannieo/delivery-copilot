import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { productAnalystPrompt } from '../shared/prompts/product-analyst-prompt.ts';
import { defaultAgentModelConfig } from '../config/index.ts';
import { retrieveProjectContextTool } from '../tools/retrieve-project-context-tool.ts';

export const productAnalystAgent = new Agent({
  id: 'product-analyst-agent',
  name: 'Product Analyst Agent',
  description:
    "Extracts business goals, users, functional requirements, non-functional requirements, assumptions, and open questions from raw project input.",
  instructions: `
${productAnalystPrompt}

Tool usage rules:
- Use retrieveProjectContextTool if projectId is provided and previous context may exist.
`,
  model: defaultAgentModelConfig,
  memory: new Memory(),
  tools: {
    retrieveProjectContextTool,
  }
});
