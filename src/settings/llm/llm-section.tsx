import { useCallback, useEffect, useState } from "react";
import {
  deleteLlmApiKey,
  hasLlmApiKey,
  saveLlmApiKey,
} from "../../shared/lib/tauri-commands";
import LlmLocalSettings from "./llm-local-settings";
import LlmRemoteSettings from "./llm-remote-settings";
import remoteProviderConfig from "./remote-provider-config";

export default function LlmSection() {
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [keyStatus, setKeyStatus] = useState<Record<string, boolean>>({});

  const refreshStatus = useCallback(async () => {
    const entries = await Promise.all(
      remoteProviderConfig.map(async (p) => [p.id, await hasLlmApiKey(p.id)] as const),
    );
    setKeyStatus(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    refreshStatus().catch(console.error);
  }, [refreshStatus]);

  const handleSave = useCallback(
    async (providerId: string, key: string) => {
      await saveLlmApiKey(providerId, key);
      await refreshStatus();
    },
    [refreshStatus],
  );

  const handleRemove = useCallback(
    async (providerId: string) => {
      await deleteLlmApiKey(providerId);
      await refreshStatus();
    },
    [refreshStatus],
  );

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
          placeholder={provider.placeholder}
          isSet={keyStatus[provider.id] ?? false}
          onSave={(key) => handleSave(provider.id, key)}
          onRemove={() => handleRemove(provider.id)}
        />
      ))}
    </section>
  );
}
