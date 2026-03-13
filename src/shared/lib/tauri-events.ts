import type { AgentState, DownloadProgress } from "../types/config";

export const EVENTS = {
  AGENT_STATE_CHANGED: "agent-state-changed",
  DOWNLOAD_PROGRESS: "download-progress",
  DOWNLOAD_COMPLETE: "download-complete",
  DOWNLOAD_ERROR: "download-error",
  TRANSCRIPTION_COMPLETE: "transcription-complete",
  AUDIO_LEVEL: "audio-level",
  HOTKEY_STATE: "hotkey-state",
  MODEL_LOADED: "model-loaded",
  LLM_DOWNLOAD_PROGRESS: "llm-download-progress",
  LLM_DOWNLOAD_COMPLETE: "llm-download-complete",
  LLM_DOWNLOAD_ERROR: "llm-download-error",
  LLM_MODEL_LOADED: "llm-model-loaded",
} as const;

export interface AgentStatePayload {
  state: AgentState;
}

export interface DownloadProgressPayload extends DownloadProgress {}

export interface DownloadCompletePayload {
  modelId: string;
}

export interface DownloadErrorPayload {
  modelId: string;
  error: string;
}

export interface TranscriptionCompletePayload {
  text: string;
}

export interface ModelLoadedPayload {
  modelId: string;
}

export interface AudioLevelPayload {
  level: number;
}

export interface HotkeyStatePayload {
  pressed: boolean;
}

export type LlmDownloadProgressPayload = DownloadProgress;

export interface LlmDownloadCompletePayload {
  modelId: string;
}

export interface LlmDownloadErrorPayload {
  modelId: string;
  error: string;
}

export interface LlmModelLoadedPayload {
  modelId: string;
}
