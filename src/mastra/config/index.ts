const DEFAULT_AGENT_MODEL = "ollama-cloud/gpt-oss:120b";

const MODEL_PROVIDER_CREDENTIALS: Record<string, string> = {
  "ollama-cloud": "OLLAMA_API_KEY",
  google: "GOOGLE_API_KEY",
  openai: "OPENAI_API_KEY",
};

type EnvLike = Record<string, string | undefined>;

export function validateModelIdentifier(model: string, envName: string): void {
  const [provider, ...modelParts] = model.split("/");
  const modelName = modelParts.join("/");

  if (!provider || !modelName) {
    throw new Error(`${envName} must use provider/model-name format; received "${model}"`);
  }
}

export function readModelIdFromEnv(input: {
  env?: EnvLike;
  envName: string;
  fallback: string;
}): string {
  const model = input.env?.[input.envName] ?? input.fallback;
  validateModelIdentifier(model, input.envName);
  return model;
}

export function validateModelProviderCredential(input: {
  env?: EnvLike;
  envName: string;
  model: string;
  skipCredential?: boolean;
}): void {
  validateModelIdentifier(input.model, input.envName);

  if (input.skipCredential) {
    return;
  }

  const provider = input.model.split("/")[0]!;
  const credentialName = MODEL_PROVIDER_CREDENTIALS[provider];
  if (!credentialName) {
    return;
  }

  const env = input.env ?? process.env;
  if (!env[credentialName]) {
    throw new Error(
      `${input.envName} uses ${input.model} but ${credentialName} is not configured`,
    );
  }
}

export function validateModelConfiguration(input: {
  agentModel: string;
  embeddingModel?: string;
  embeddingBaseUrl?: string;
  ragEnabled?: boolean;
  env?: EnvLike;
}): void {
  validateModelProviderCredential({
    env: input.env,
    envName: "AGENT_MODEL",
    model: input.agentModel,
  });

  if (!input.ragEnabled) {
    return;
  }

  if (!input.embeddingModel) {
    throw new Error("RAG_ENABLED is true but RAG_EMBEDDING_MODEL is not configured");
  }

  validateModelProviderCredential({
    env: input.env,
    envName: "RAG_EMBEDDING_MODEL",
    model: input.embeddingModel,
    skipCredential: Boolean(input.embeddingBaseUrl),
  });
}

export const defaultAgentModel = readModelIdFromEnv({
  envName: "AGENT_MODEL",
  fallback: DEFAULT_AGENT_MODEL,
});

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
