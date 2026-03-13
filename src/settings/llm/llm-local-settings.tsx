import { useCallback, useEffect, useState } from "react";
import Card from "../../shared/components/card";
import { getLlmModels } from "../../shared/lib/tauri-commands";
import { EVENTS } from "../../shared/lib/tauri-events";
import { useTauriEvent } from "../../shared/hooks/use-tauri-event";
import type { LlmModelStatus } from "../../shared/types/llm";
import type { DownloadProgress } from "../../shared/types/config";
import LlmModelDownloadRow from "./llm-model-download-row";

interface LlmLocalSettingsProps {
  loadedId: string | null;
  onModelLoaded: (modelId: string) => void;
}

export default function LlmLocalSettings({
  loadedId,
  onModelLoaded,
}: LlmLocalSettingsProps) {
  const [models, setModels] = useState<LlmModelStatus[]>([]);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  const refreshModels = useCallback(() => {
    getLlmModels()
      .then(setModels)
      .catch(() => setModels([]));
  }, []);

  useEffect(() => {
    refreshModels();
  }, [refreshModels]);

  useTauriEvent<DownloadProgress>(EVENTS.LLM_DOWNLOAD_PROGRESS, setProgress);

  useTauriEvent(EVENTS.LLM_DOWNLOAD_COMPLETE, useCallback(() => {
    setProgress(null);
    refreshModels();
  }, [refreshModels]));

  useTauriEvent(EVENTS.LLM_DOWNLOAD_ERROR, useCallback(() => {
    setProgress(null);
  }, []));

  useTauriEvent<{ modelId: string }>(
    EVENTS.LLM_MODEL_LOADED,
    useCallback((payload: { modelId: string }) => {
      onModelLoaded(payload.modelId);
    }, [onModelLoaded]),
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-text-secondary">Local Models</h3>
      <Card className="divide-y divide-border">
        {models.map((model) => (
          <LlmModelDownloadRow
            key={model.id}
            model={model}
            loadedId={loadedId}
            progress={progress}
            onDownloadDone={refreshModels}
          />
        ))}
      </Card>
    </div>
  );
}
