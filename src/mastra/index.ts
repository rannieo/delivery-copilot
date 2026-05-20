import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
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
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new LibSQLStore({
      id: "mastra-storage",
      url: "file:./mastra.db",
    }),
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
          new MastraStorageExporter(), // Persists observability events to Mastra Storage
          new MastraPlatformExporter(), // Sends observability events to Mastra Platform (if MASTRA_PLATFORM_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
});
