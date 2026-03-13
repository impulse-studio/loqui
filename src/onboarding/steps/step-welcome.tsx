import { useCallback, useEffect, useRef, useState } from "react";
import {
  getModels,
  loadSttModel,
  type ModelStatus,
} from "../../shared/lib/tauri-commands";
import { DEFAULT_CONFIG } from "../../shared/types/config";
import { useAgentStore } from "../../shared/stores/agent-store";
import useDownloadEvents from "../../shared/hooks/use-download-events";
import ModelCard from "../../shared/components/model-card";
import type { StepComponentProps } from "../step-registry";

export default function StepWelcome({ goNext, setFooter }: StepComponentProps) {
  const [models, setModels] = useState<ModelStatus[]>([]);
  const [selectedId, setSelectedId] = useState(DEFAULT_CONFIG.sttModel!);
  const updateConfig = useAgentStore((s) => s.updateConfig);
  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;
  const advancedRef = useRef(false);

  const onDownloadComplete = useCallback(() => {
    getModels().then((m) => {
      setModels(m);
      if (!advancedRef.current) {
        advancedRef.current = true;
        updateConfig("sttModel", selectedId);
        loadSttModel(selectedId).catch(console.error);
        goNextRef.current();
      }
    }).catch(console.error);
  }, [selectedId, updateConfig]);

  const { downloading, error, pct, startDownload, cancel } =
    useDownloadEvents(onDownloadComplete);

  const selectedModel = models.find((m) => m.id === selectedId);
  const isDownloaded = selectedModel?.downloaded ?? false;

  useEffect(() => {
    if (models.length === 0) {
      setFooter({ label: "Loading...", onClick: () => {}, disabled: true });
      return;
    }

    if (downloading) {
      setFooter({
        label: `Downloading... ${pct}%`,
        onClick: () => {},
        disabled: true,
        loading: true,
        progress: pct,
        onCancel: cancel,
      });
      return;
    }

    if (isDownloaded) {
      setFooter({
        label: "Continue",
        onClick: () => {
          updateConfig("sttModel", selectedId);
          loadSttModel(selectedId).catch(console.error);
          goNextRef.current();
        },
      });
    } else {
      setFooter({
        label: "Download",
        onClick: () => {
          advancedRef.current = false;
          startDownload(selectedId);
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models, selectedId, isDownloaded, downloading, pct, setFooter, updateConfig, cancel]);

  useEffect(() => {
    getModels()
      .then((m) => {
        setModels(m);
        const alreadyDownloaded = m.find((x) => x.downloaded);
        if (alreadyDownloaded) {
          setSelectedId(alreadyDownloaded.id);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        Welcome to Loqui
      </h2>
      <p className="text-sm text-text-secondary mb-6">
        Choose a speech recognition model. It runs locally on your device.
      </p>

      <div className="grid grid-cols-4 gap-3">
        {models.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            selected={selectedId === model.id}
            disabled={downloading}
            onSelect={() => setSelectedId(model.id)}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-error mt-4">{error}</p>
      )}

    </div>
  );
}
