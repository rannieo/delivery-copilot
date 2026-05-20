import { createStep } from "@mastra/core/workflows";
import {
  DeliveryWorkflowContextSchema,
  DeliveryWorkflowInputSchema,
} from "../../shared/schema/delivery-schema";
import { createWorkflowRun } from "../../../db/repositories/workflow-run-repository";
import { createProject } from "../../../db/repositories/project-repository";

export const initializeWorkflowRunStep = createStep({
  id: "initialize-workflow-run-step",
  description: "Creates a project and workflow run record before agent execution starts.",
  inputSchema: DeliveryWorkflowInputSchema,
  outputSchema: DeliveryWorkflowContextSchema,

  execute: async ({ inputData, runId }) => {
    const project = await createProject({
      name: inputData.projectName,
      description: inputData.projectDescription,
    });

    const run = await createWorkflowRun({
      projectId: project.id,
      mastraRunId: runId,
      inputText: inputData.rawInput,
    });

    return {
      projectId: project.id,
      workflowRunId: run.id,
      rawInput: inputData.rawInput,
      planTitle: inputData.planTitle,
      useRag: inputData.useRag,
      artifacts: [],
    };
  },
});
