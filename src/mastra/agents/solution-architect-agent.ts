import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { solutionArchitectPrompt } from '../shared/prompts/solution-architect-prompt';
import { retrieveProjectContextTool } from '../tools/retrieve-project-context-tool';
import { saveAgentOutputTool } from '../tools/save-agent-output-tool';

export const solutionArchitectAgent = new Agent({
  id: 'solution-architect-agent',
  name: 'Solution Architect Agent',
  description:
    "Proposes practical system architecture, components, integrations, risks, tradeoffs, and ADR candidates.",
  instructions: `
${solutionArchitectPrompt}

Tool usage rules:
- Use retrieveProjectContextTool to read Product Analyst output and project constraints.
- Use saveAgentOutputTool after producing the final Solution Architecture Proposal.
- Do not generate backend APIs in full detail. Only provide architecture-level guidance.
- Do not call ticket or markdown export tools.
`,
  model: 'ollama-cloud/qwen3.5:397b',
  memory: new Memory(),
  tools: {
    retrieveProjectContextTool,
    saveAgentOutputTool,
  }
});
