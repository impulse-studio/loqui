export type AgentState =
  | "idle"
  | "recording"
  | "processing"
  | "success"
  | "error";

export type LlmProvider =
  | "local"
  | "openai"
  | "anthropic"
  | "google"
  | "custom";

export type WidgetPosition =
  | "bottom-left"
  | "bottom-right"
  | "bottom-center"
  | "top-left"
  | "top-right"
  | "top-center"
  | "custom";

export type WidgetSize = "small" | "medium" | "large";
export type WidgetStyle = "minimal" | "standard" | "expressive";
export type TranscriptRetention = "100mb" | "500mb" | "1gb" | "5gb" | "unlimited";

export interface AppConfig {
  hotkey: string;
  defaultProfileId: string;
  sttModel: string;
  sttLanguage: string;
  llmProvider: LlmProvider;
  llmApiKey: string;
  llmModel: string;
  llmEnabled: string;
  llmApiKeyOpenai: string;
  llmApiKeyAnthropic: string;
  llmApiKeyGoogle: string;
  autoPaste: string;
  copyToClipboard: string;
  launchAtStartup: string;
  notificationSounds: string;
  widgetVisible: string;
  widgetPosition: WidgetPosition;
  widgetSize: WidgetSize;
  widgetStyle: WidgetStyle;
  transcriptRetention: TranscriptRetention;
  onboardingComplete: string;
}

export const DEFAULT_CONFIG: Partial<AppConfig> = {
  hotkey: "alt+space",
  sttModel: "whisper-base",
  sttLanguage: "auto",
  llmProvider: "local",
  llmEnabled: "false",
  autoPaste: "true",
  copyToClipboard: "true",
  launchAtStartup: "false",
  notificationSounds: "true",
  widgetVisible: "true",
  widgetPosition: "bottom-right",
  widgetSize: "medium",
  widgetStyle: "standard",
  transcriptRetention: "unlimited",
  onboardingComplete: "false",
};

export interface ModelInfo {
  id: string;
  name: string;
  fileName: string;
  size: number;
  sha256: string;
  url: string;
  accuracyTier: "low" | "medium" | "high" | "very-high";
  description: string;
}

export interface DownloadProgress {
  modelId: string;
  downloaded: number;
  total: number;
  speed: number;
}
