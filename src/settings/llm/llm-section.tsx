import { useCallback, useState } from "react";
import { setConfig } from "../../shared/lib/tauri-commands";
import useSettingsConfig from "../use-settings-config";
import LlmLocalSettings from "./llm-local-settings";
import LlmRemoteSettings from "./llm-remote-settings";
import remoteProviderConfig from "./remote-provider-config";

export default function LlmSection() {
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

  useSettingsConfig((cfg) => {
    setApiKeys({
      llmApiKeyOpenai: cfg.llmApiKeyOpenai ?? "",
      llmApiKeyAnthropic: cfg.llmApiKeyAnthropic ?? "",
      llmApiKeyGoogle: cfg.llmApiKeyGoogle ?? "",
    });
  });

  function handleApiKeyChange(configKey: string, value: string) {
    setApiKeys((prev) => ({ ...prev, [configKey]: value }));
    setConfig(configKey, value);
  }

  const handleModelLoaded = useCallback((modelId: string) => {
    setLoadedId(modelId);
  }, []);

  return (
    <section className="mb-8 space-y-4">
      <h2 className="text-base font-semibold">LLM Refactoring</h2>

      <LlmLocalSettings loadedId={loadedId} onModelLoaded={handleModelLoaded} />

      {remoteProviderConfig.map((provider) => (
        <LlmRemoteSettings
          key={provider.id}
          name={provider.name}
          apiKey={apiKeys[provider.configKey] ?? ""}
          placeholder={provider.placeholder}
          onApiKeyChange={(value) => handleApiKeyChange(provider.configKey, value)}
        />
      ))}
    </section>
  );
}
