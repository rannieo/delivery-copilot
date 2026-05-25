import { ModelRouterEmbeddingModel } from "@mastra/core/llm";
import { embed, embedMany } from "ai";
import type { OpenAIEmbeddingsParams } from "@langchain/openai";
import {
  createRagEmbeddingModelConfig,
  ragConfig,
  type RagConfig,
} from "./config.ts";

type MastraEmbeddingModel = Parameters<typeof embedMany>[0]["model"];

export type LangChainEmbeddings = {
  embedDocuments: (texts: string[]) => Promise<number[][]>;
  embedQuery: (text: string) => Promise<number[]>;
};

export type LangChainOpenAIEmbeddingsConfig = Partial<OpenAIEmbeddingsParams> & {
  apiKey?: string;
  configuration?: {
    baseURL: string;
  };
};

export type RagEmbeddingDeps = {
  createMastraEmbeddingModel: (config: RagConfig) => MastraEmbeddingModel;
  embedMany: typeof embedMany;
  embed: typeof embed;
  createLangChainOpenAIEmbeddings: (
    config: RagConfig,
  ) => Promise<LangChainEmbeddings>;
};

function resolveEmbeddingModelId(config: RagConfig): string {
  if (!config.embeddingModel) {
    throw new Error("RAG_EMBEDDING_MODEL is not configured");
  }

  const [providerId, ...modelParts] = config.embeddingModel.split("/");
  const modelId = modelParts.join("/");
  if (!providerId || !modelId) {
    throw new Error(
      `RAG_EMBEDDING_MODEL must use provider/model-name format; received "${config.embeddingModel}"`,
    );
  }

  return modelId;
}

export function createLangChainOpenAIEmbeddingsConfig(
  config: RagConfig = ragConfig,
): LangChainOpenAIEmbeddingsConfig {
  const embeddingsConfig: LangChainOpenAIEmbeddingsConfig = {
    model: resolveEmbeddingModelId(config),
  };

  if (config.embeddingApiKey) {
    embeddingsConfig.apiKey = config.embeddingApiKey;
  }

  if (config.embeddingBaseUrl) {
    embeddingsConfig.configuration = {
      baseURL: config.embeddingBaseUrl,
    };
  }

  return embeddingsConfig;
}

export async function createLangChainOpenAIEmbeddings(
  config: RagConfig = ragConfig,
): Promise<LangChainEmbeddings> {
  const { OpenAIEmbeddings } = await import("@langchain/openai");
  return new OpenAIEmbeddings(createLangChainOpenAIEmbeddingsConfig(config));
}

const defaultRagEmbeddingDeps: RagEmbeddingDeps = {
  createMastraEmbeddingModel: (config) =>
    new ModelRouterEmbeddingModel(createRagEmbeddingModelConfig(config)),
  embedMany,
  embed,
  createLangChainOpenAIEmbeddings,
};

function resolveDeps(deps: Partial<RagEmbeddingDeps> = {}): RagEmbeddingDeps {
  return {
    ...defaultRagEmbeddingDeps,
    ...deps,
  };
}

export async function embedTextDocuments(
  texts: string[],
  config: RagConfig = ragConfig,
  deps: Partial<RagEmbeddingDeps> = {},
): Promise<number[][]> {
  const resolvedDeps = resolveDeps(deps);

  if (config.embeddingDriver === "langchain-openai") {
    const embeddings = await resolvedDeps.createLangChainOpenAIEmbeddings(config);
    return embeddings.embedDocuments(texts);
  }

  const model = resolvedDeps.createMastraEmbeddingModel(config);
  const { embeddings } = await resolvedDeps.embedMany({
    model,
    values: texts,
    maxParallelCalls: 2,
    maxRetries: 1,
  });

  return embeddings;
}

export async function embedTextQuery(
  text: string,
  config: RagConfig = ragConfig,
  deps: Partial<RagEmbeddingDeps> = {},
): Promise<number[]> {
  const resolvedDeps = resolveDeps(deps);

  if (config.embeddingDriver === "langchain-openai") {
    const embeddings = await resolvedDeps.createLangChainOpenAIEmbeddings(config);
    return embeddings.embedQuery(text);
  }

  const model = resolvedDeps.createMastraEmbeddingModel(config);
  const { embedding } = await resolvedDeps.embed({
    model,
    value: text,
    maxRetries: 1,
  });

  return embedding;
}
