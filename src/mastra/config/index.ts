export const defaultAgentModel = "ollama-cloud/gpt-oss:120b";

export const defaultAgentModelSettings = {
  temperature: 0.2,
  maxOutputTokens: 1800,
};

export const defaultAgentModelConfig = [
  {
    model: defaultAgentModel,
    modelSettings: defaultAgentModelSettings,
  },
];
