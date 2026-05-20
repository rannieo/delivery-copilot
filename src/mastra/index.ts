import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { DuckDBStore } from "@mastra/duckdb";
import { MastraCompositeStore } from '@mastra/core/storage';
import { Observability, MastraStorageExporter, MastraPlatformExporter, SensitiveDataFilter } from '@mastra/observability';
import { backendLeadAgent } from './agents/backend-lead-agent';
import { deliverManagerAgent } from './agents/delivery-manager-agent';
import { productAnalystAgent } from './agents/product-analyst-agent';
import { qaEngineerAgent } from './agents/qa-engineer-agent';
import { securityManagerAgent } from './agents/security-manager-agent';
import { solutionArchitectAgent } from './agents/solution-architect-agent';
import { finalPlanAggregatorAgent } from './agents/final-plan-aggregator-agent';
import { deliveryCopilotWorkflow } from './workflows/delivery-copilot-workflow';
import { frontendLeadAgent } from './agents/frontend-lead-agent';
import { mobileLeadAgent } from './agents/mobile-lead-agent';
import { mastraStorage } from './storage';
import { createMastraWorkspace } from './workspace';

export const mastra = new Mastra({
  workflows: {
    deliveryCopilotWorkflow
  },
  agents: {
    backendLeadAgent,
    deliverManagerAgent,
    productAnalystAgent,
    qaEngineerAgent,
    securityManagerAgent,
    solutionArchitectAgent,
    finalPlanAggregatorAgent,
    frontendLeadAgent,
    mobileLeadAgent,
  },
  workspace: createMastraWorkspace(),
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: mastraStorage,
    domains: {
      observability: await new DuckDBStore().getStore('observability'),
    }
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new MastraStorageExporter(),
          new MastraPlatformExporter(),
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(),
        ],
      },
    },
  }),
});
