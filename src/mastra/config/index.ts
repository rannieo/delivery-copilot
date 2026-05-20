export const defaultAgentModel = "ollama-cloud/gpt-oss:120b";

const DEFAULT_MAX_OUTPUT_TOKENS = 8000;
const WORKFLOW_MAX_OUTPUT_TOKENS = 16000;

export const defaultAgentModelSettings = {
  temperature: 0.2,
  maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
};

export const deliveryWorkflowModelSettings = {
  ...defaultAgentModelSettings,
  maxOutputTokens: WORKFLOW_MAX_OUTPUT_TOKENS,
};

export const defaultAgentModelConfig = [
  {
    model: defaultAgentModel,
    modelSettings: defaultAgentModelSettings,
  },
];
