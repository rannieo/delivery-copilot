export const defaultAgentModel = "ollama-cloud/gpt-oss:120b";
const WORKFLOW_SAFE_MAX_OUTPUT_TOKENS = 8000;

export const defaultAgentModelSettings = {
  temperature: 0.2,
  maxOutputTokens: WORKFLOW_SAFE_MAX_OUTPUT_TOKENS,
};

export const deliveryWorkflowModelSettings = {
  ...defaultAgentModelSettings,
  maxOutputTokens: WORKFLOW_SAFE_MAX_OUTPUT_TOKENS,
};

export const defaultAgentModelConfig = [
  {
    model: defaultAgentModel,
    modelSettings: defaultAgentModelSettings,
  },
];
