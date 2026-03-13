import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getLlmModels,
  getLlmApiKeyStatus,
  fetchRemoteModels,
} from "../../shared/lib/tauri-commands";
import type {
  ApiKeyStatus,
  RemoteModelEntry,
} from "../../shared/lib/tauri-commands";
import type { LlmModelStatus } from "../../shared/types/llm";
import formatSize from "../../shared/lib/utils/format-size";
import LlmModelOption from "./llm-model-option";
import ContextSizeSlider from "./context-size-slider";
import SearchableSelect from "../../shared/components/searchable-select";
import cn from "../../shared/lib/utils/cn";
import providerTabOptions from "./provider-tab-options";

interface LlmModelSelectorProps {
  llmProvider: string;
  llmModel: string;
  contextSize: number;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  onContextSizeChange: (size: number) => void;
}

export default function LlmModelSelector({
  llmProvider,
  llmModel,
  contextSize,
  onProviderChange,
  onModelChange,
  onContextSizeChange,
}: LlmModelSelectorProps) {
  const [localModels, setLocalModels] = useState<LlmModelStatus[]>([]);
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null);
  const [remoteModels, setRemoteModels] = useState<
    Record<string, RemoteModelEntry[]>
  >({});
  const [loadingModels, setLoadingModels] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getLlmModels()
      .then(setLocalModels)
      .catch(() => setLocalModels([]));
    getLlmApiKeyStatus()
      .then(setApiKeyStatus)
      .catch(() => null);
  }, []);

  // Fetch remote models from OpenRouter (no API key needed)
  useEffect(() => {
    if (
      llmProvider === "disabled" ||
      llmProvider === "local" ||
      remoteModels[llmProvider]
    ) {
      return;
    }

    setLoadingModels(true);
    fetchRemoteModels(llmProvider)
      .then((models) => {
        setRemoteModels((prev) => ({ ...prev, [llmProvider]: models }));
      })
      .catch(() => {
        // Fetch failed — will use hardcoded fallback
      })
      .finally(() => setLoadingModels(false));
  }, [llmProvider, remoteModels]);

  const isRemoteProvider =
    llmProvider !== "disabled" && llmProvider !== "local";
  const hasApiKey =
    apiKeyStatus && apiKeyStatus[llmProvider as keyof ApiKeyStatus];
  const currentModels = isRemoteProvider
    ? remoteModels[llmProvider] ?? []
    : [];

  const selectOptions = useMemo(
    () =>
      currentModels.map((m) => ({
        value: m.id,
        label: m.name,
        badge: m.badge ?? undefined,
      })),
    [currentModels],
  );

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-text-primary">
        LLM Refactoring
      </label>

      <div className="flex gap-1 p-1 rounded-lg bg-bg-secondary">
        {providerTabOptions.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onProviderChange(tab.id)}
            className={cn(
              "flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer",
              llmProvider === tab.id
                ? "bg-bg-primary text-text-primary shadow-sm"
                : "text-text-tertiary hover:text-text-secondary",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {llmProvider === "disabled" && (
        <p className="text-xs text-text-tertiary">
          LLM refactoring is disabled for this profile.
        </p>
      )}

      {llmProvider === "local" && (
        <div className="space-y-3">
          <div className="space-y-1">
            {localModels.map((model) => (
              <LlmModelOption
                key={model.id}
                label={model.name}
                description={`${model.description} · ${formatSize(model.size)}`}
                selected={llmModel === model.id}
                downloaded={model.downloaded}
                onSelect={() => onModelChange(model.id)}
                onGoToSettings={() => navigate("/settings")}
              />
            ))}
          </div>
          <ContextSizeSlider
            value={contextSize}
            onChange={onContextSizeChange}
          />
        </div>
      )}

      {isRemoteProvider && (
        <div className="space-y-2">
          {apiKeyStatus && !hasApiKey && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 text-xs text-warning">
              <span>API key not configured.</span>
              <button
                type="button"
                onClick={() => navigate("/settings")}
                className="text-accent hover:underline cursor-pointer"
              >
                Go to Settings
              </button>
            </div>
          )}
          {loadingModels ? (
            <p className="text-xs text-text-tertiary px-1 py-2">
              Loading models…
            </p>
          ) : (
            <SearchableSelect
              options={selectOptions}
              value={llmModel}
              onChange={onModelChange}
              placeholder="Select a model"
            />
          )}
        </div>
      )}
    </div>
  );
}
