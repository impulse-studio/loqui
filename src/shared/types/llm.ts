import type { ModelInfo } from "./config";

export interface LlmModelInfo extends Omit<ModelInfo, "accuracyTier"> {
  contextWindow: number;
}

export interface LlmModelStatus extends LlmModelInfo {
  downloaded: boolean;
}

export interface RefactorResult {
  text: string;
  modelUsed: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
}

