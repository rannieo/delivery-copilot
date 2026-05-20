import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { platformLeadPrompt } from "../shared/prompts/platform-lead-prompt.ts";
import { defaultAgentModelConfig } from "../config/index.ts";
import { retrieveProjectContextTool } from "../tools/retrieve-project-context-tool.ts";

export const platformLeadAgent = new Agent({
  id: "platform-lead-agent",
  name: "Platform Lead Agent",
  description:
    "Defines how the system is shipped and run: hosting target, CI/CD pipeline, environments, secrets management, observability stack (named tools), SLO/SLI plan, backups/DR with RTO/RPO targets, runbooks for the top 3 failure scenarios, on-call basics, and cost estimates. Forbidden from generic infra fluff — every decision names a specific tool and cites a concrete constraint from prior agent outputs.",
  instructions: `
${platformLeadPrompt}

Tool usage rules:
- Use retrieveProjectContextTool to read Product Analyst, Solution Architect, Security, Backend Lead, and Mobile Lead outputs.
- Do not propose application code or business logic. Your scope is operational.
- Do not create delivery tickets directly.
`,
  model: defaultAgentModelConfig,
  memory: new Memory(),
  tools: {
    retrieveProjectContextTool,
  },
});
