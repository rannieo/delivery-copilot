import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { productAnalystPrompt } from '../shared/prompts/product-analyst-prompt';
import { defaultAgentModelConfig } from '../config';
import { parseProjectInputTool } from '../tools/parse-project-input-tool';
import { retrieveProjectContextTool } from '../tools/retrieve-project-context-tool';

export const productAnalystAgent = new Agent({
  id: 'product-analyst-agent',
  name: 'Product Analyst Agent',
  description:
    "Extracts business goals, users, functional requirements, non-functional requirements, assumptions, and open questions from raw project input.",
  instructions: `
${productAnalystPrompt}

Tool usage rules:
- Use parseProjectInputTool when the input is raw PRD text, meeting notes, or unstructured feature requests.
- Use retrieveProjectContextTool if projectId is provided and previous context may exist.
- Do not call security, ticket, or markdown export tools.
`,
  model: defaultAgentModelConfig,
  memory: new Memory(),
  tools: {
    parseProjectInputTool,
    retrieveProjectContextTool,
  }
});
