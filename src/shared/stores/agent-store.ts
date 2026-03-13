import { create } from "zustand";
import type { AgentState } from "../types/config";

interface AgentStoreState {
  state: AgentState;
  audioLevel: number;
  config: Record<string, string>;
  setState: (state: AgentState) => void;
  setAudioLevel: (level: number) => void;
  setConfig: (config: Record<string, string>) => void;
  updateConfig: (key: string, value: string) => void;
  getConfigValue: (key: string, fallback?: string) => string;
}

export const useAgentStore = create<AgentStoreState>((set, get) => ({
  state: "idle",
  audioLevel: 0,
  config: {},
  setState: (state) => set({ state }),
  setAudioLevel: (audioLevel) => set({ audioLevel }),
  setConfig: (config) => set({ config }),
  updateConfig: (key, value) =>
    set((s) => ({ config: { ...s.config, [key]: value } })),
  getConfigValue: (key, fallback = "") => {
    return get().config[key] ?? fallback;
  },
}));
