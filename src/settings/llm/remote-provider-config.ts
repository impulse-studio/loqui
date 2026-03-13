interface RemoteProviderConfig {
  id: string;
  name: string;
  configKey: string;
  placeholder: string;
}

const remoteProviderConfig: RemoteProviderConfig[] = [
  { id: "openai", name: "OpenAI", configKey: "llmApiKeyOpenai", placeholder: "sk-..." },
  { id: "anthropic", name: "Anthropic", configKey: "llmApiKeyAnthropic", placeholder: "sk-ant-api03-... / sk-ant-oat01-..." },
  { id: "google", name: "Google", configKey: "llmApiKeyGoogle", placeholder: "AIza..." },
];

export default remoteProviderConfig;
