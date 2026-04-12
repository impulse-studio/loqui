import { invoke } from "@tauri-apps/api/core";
import type { ActivityPoint, Transcript, TranscriptStats } from "../types/transcript";
import type { Profile } from "../types/profile";
import type { ModelInfo } from "../types/config";
import type { LlmModelStatus, RefactorResult } from "../types/llm";

export async function getConfig(): Promise<Record<string, string>> {
  return invoke("get_config");
}

export async function setConfig(key: string, value: string): Promise<void> {
  return invoke("set_config", { key, value });
}

export async function getTranscripts(params?: {
  search?: string;
  filter?: string;
  limit?: number;
  offset?: number;
}): Promise<Transcript[]> {
  return invoke("get_transcripts", params ?? {});
}

export async function getTranscript(id: string): Promise<Transcript> {
  return invoke("get_transcript", { id });
}

export async function deleteTranscript(id: string): Promise<void> {
  return invoke("delete_transcript", { id });
}

export async function getTranscriptStats(): Promise<TranscriptStats> {
  return invoke("get_transcript_stats");
}

export async function getActivity(days: number): Promise<ActivityPoint[]> {
  return invoke("get_activity", { days });
}

export async function getProfiles(): Promise<Profile[]> {
  return invoke("get_profiles");
}

export async function getProfile(id: string): Promise<Profile> {
  return invoke("get_profile", { id });
}

export async function saveProfile(profile: Profile): Promise<Profile> {
  return invoke("save_profile", { profile });
}

export async function deleteProfile(id: string): Promise<void> {
  return invoke("delete_profile", { id });
}

export async function clearAllData(): Promise<void> {
  return invoke("clear_all_data");
}

export interface ModelStatus extends ModelInfo {
  downloaded: boolean;
}

export interface TranscriptionResult {
  text: string;
  durationMs: number;
}

export async function getModels(): Promise<ModelStatus[]> {
  return invoke("get_models");
}

export async function downloadModel(modelId: string): Promise<void> {
  return invoke("download_model", { modelId });
}

export async function cancelDownload(): Promise<void> {
  return invoke("cancel_download");
}

export async function verifyModel(modelId: string): Promise<boolean> {
  return invoke("verify_model", { modelId });
}

export async function setHotkey(hotkey: string): Promise<void> {
  return invoke("set_hotkey", { hotkey });
}

export interface AudioDevice {
  name: string;
  isDefault: boolean;
}

export async function getAudioDevices(): Promise<AudioDevice[]> {
  return invoke("get_audio_devices");
}

export async function loadSttModel(modelId: string): Promise<void> {
  return invoke("load_stt_model", { modelId });
}

export async function startRecording(): Promise<void> {
  return invoke("start_recording");
}

export async function stopRecording(): Promise<TranscriptionResult> {
  return invoke("stop_recording");
}

// LLM commands

export async function getLlmModels(): Promise<LlmModelStatus[]> {
  return invoke("get_llm_models");
}

export async function downloadLlmModel(modelId: string): Promise<void> {
  return invoke("download_llm_model", { modelId });
}

export async function cancelLlmDownload(): Promise<void> {
  return invoke("cancel_llm_download");
}

export async function verifyLlmModel(modelId: string): Promise<boolean> {
  return invoke("verify_llm_model", { modelId });
}

export async function loadLlmModel(modelId: string): Promise<void> {
  return invoke("load_llm_model", { modelId });
}

export async function unloadLlmModel(): Promise<void> {
  return invoke("unload_llm_model");
}

export async function testRefactor(
  text: string,
  systemPrompt: string,
  profileId?: string,
): Promise<RefactorResult> {
  return invoke("test_refactor", { text, systemPrompt, profileId });
}

export async function getDetectedApps(): Promise<string[]> {
  return invoke("get_detected_apps");
}

export interface ApiKeyStatus {
  openai: boolean;
  anthropic: boolean;
  google: boolean;
}

export async function getLlmApiKeyStatus(): Promise<ApiKeyStatus> {
  return invoke("get_llm_api_key_status");
}

export interface RemoteModelEntry {
  id: string;
  name: string;
  created: number;
  badge: string | null;
}

export async function fetchRemoteModels(
  provider: string,
): Promise<RemoteModelEntry[]> {
  return invoke("fetch_remote_models", { provider });
}

export async function exportTranscripts(path: string): Promise<void> {
  return invoke("export_transcripts", { path });
}

export async function applyWidgetSettings(): Promise<void> {
  return invoke("apply_widget_settings");
}

export async function enableAutostart(): Promise<void> {
  return invoke("plugin:autostart|enable");
}

export async function disableAutostart(): Promise<void> {
  return invoke("plugin:autostart|disable");
}

export async function isAutostartEnabled(): Promise<boolean> {
  return invoke("plugin:autostart|is_enabled");
}
