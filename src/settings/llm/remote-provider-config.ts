interface RemoteProviderConfig {
  id: string;
  name: string;
  placeholder: string;
}

const remoteProviderConfig: RemoteProviderConfig[] = [
  { id: "openai", name: "OpenAI", placeholder: "sk-..." },
  { id: "anthropic", name: "Anthropic", placeholder: "sk-ant-api03-... / sk-ant-oat01-..." },
  { id: "google", name: "Google", placeholder: "AIza..." },
];

export default remoteProviderConfig;
