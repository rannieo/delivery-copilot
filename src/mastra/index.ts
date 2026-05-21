import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { DuckDBStore } from "@mastra/duckdb";
import { MastraCompositeStore } from '@mastra/core/storage';
import { Observability, MastraStorageExporter, MastraPlatformExporter, SensitiveDataFilter } from '@mastra/observability';
import { backendLeadAgent } from './agents/backend-lead-agent.ts';
import { deliverManagerAgent } from './agents/delivery-manager-agent.ts';
import { productAnalystAgent } from './agents/product-analyst-agent.ts';
import { qaEngineerAgent } from './agents/qa-engineer-agent.ts';
import { securityManagerAgent } from './agents/security-manager-agent.ts';
import { solutionArchitectAgent } from './agents/solution-architect-agent.ts';
import { finalPlanAggregatorAgent } from './agents/final-plan-aggregator-agent.ts';
import { deliveryCopilotWorkflow } from './workflows/delivery-copilot-workflow.ts';
import { frontendLeadAgent } from './agents/frontend-lead-agent.ts';
import { mobileLeadAgent } from './agents/mobile-lead-agent.ts';
import { uxLeadAgent } from './agents/ux-lead-agent.ts';
import { platformLeadAgent } from './agents/platform-lead-agent.ts';
import { defaultAgentModel, validateModelConfiguration } from './config/index.ts';
import { ragConfig } from './rag/config.ts';
import { mastraStorage } from './storage.ts';
import { mastraWorkspace } from './workspace.ts';
import { projectDocumentApiRoutes } from './api/project-documents-routes.ts';

validateModelConfiguration({
  agentModel: defaultAgentModel,
  embeddingModel: ragConfig.embeddingModel,
});

export const mastra = new Mastra({
  server: {
    cors: {
      origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
      allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "x-mastra-client-type", "x-delivery-copilot-token"],
      exposeHeaders: ["Content-Length", "X-Requested-With"],
      credentials: true,
    },
    apiRoutes: projectDocumentApiRoutes,
  },
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
    uxLeadAgent,
    platformLeadAgent,
  },
  workspace: mastraWorkspace,
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
