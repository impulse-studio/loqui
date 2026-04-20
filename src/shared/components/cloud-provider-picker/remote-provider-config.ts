import type { SttProvider } from "../../types/config";

export interface RemoteSttProvider {
  id: Exclude<SttProvider, "local">;
  name: string;
  placeholder: string;
  defaultModel: string;
  needsCustomEndpoint: boolean;
  models: string[];
}

const remoteProviderConfig: RemoteSttProvider[] = [
  {
    id: "groq",
    name: "Groq",
    placeholder: "gsk_...",
    defaultModel: "whisper-large-v3-turbo",
    needsCustomEndpoint: false,
    models: ["whisper-large-v3-turbo", "whisper-large-v3", "distil-whisper-large-v3-en"],
  },
  {
    id: "openai",
    name: "OpenAI",
    placeholder: "sk-...",
    defaultModel: "whisper-1",
    needsCustomEndpoint: false,
    models: ["whisper-1", "gpt-4o-transcribe", "gpt-4o-mini-transcribe"],
  },
  {
    id: "deepgram",
    name: "Deepgram",
    placeholder: "dg-...",
    defaultModel: "nova-3",
    needsCustomEndpoint: false,
    models: ["nova-3", "nova-2", "enhanced", "base"],
  },
  {
    id: "custom",
    name: "Custom (OpenAI-compatible)",
    placeholder: "your-api-key",
    defaultModel: "",
    needsCustomEndpoint: true,
    models: [],
  },
];

export default remoteProviderConfig;
