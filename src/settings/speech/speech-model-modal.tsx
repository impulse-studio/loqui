import { useCallback, useEffect, useState } from "react";
import Modal from "../../shared/components/modal";
import Button from "../../shared/components/button";
import ModelCard from "../../shared/components/model-card";
import useDownloadEvents from "../../shared/hooks/use-download-events";
import cn from "../../shared/lib/utils/cn";
import {
  getModels,
  loadSttModel,
  setConfig,
  type ModelStatus,
} from "../../shared/lib/tauri-commands";

interface SpeechModelModalProps {
  open: boolean;
  currentModelId: string;
  onClose: () => void;
  onChanged: (modelId: string, modelName: string) => void;
}

export default function SpeechModelModal({
  open,
  currentModelId,
  onClose,
  onChanged,
}: SpeechModelModalProps) {
  const [models, setModels] = useState<ModelStatus[]>([]);
  const [selectedId, setSelectedId] = useState(currentModelId);
  const [applying, setApplying] = useState(false);

  const onDownloadComplete = useCallback(async () => {
    const updated = await getModels();
    setModels(updated);
    // Auto-apply after successful download
    try {
      await setConfig("sttModel", selectedId);
      await loadSttModel(selectedId);
      const model = updated.find((m) => m.id === selectedId);
      onChanged(selectedId, model?.name ?? selectedId);
    } catch (e) {
      console.error("Failed to auto-apply model:", e);
    }
  }, [selectedId, onChanged]);

  const { downloading, error, pct, startDownload, cancel } =
    useDownloadEvents(onDownloadComplete);

  const selectedModel = models.find((m) => m.id === selectedId);
  const isDownloaded = selectedModel?.downloaded ?? false;
  const isCurrentModel = selectedId === currentModelId;

  useEffect(() => {
    if (!open) return;
    setSelectedId(currentModelId);
    getModels().then(setModels);
  }, [open, currentModelId]);

  async function handleApply() {
    setApplying(true);
    try {
      await setConfig("sttModel", selectedId);
      await loadSttModel(selectedId);
      const model = models.find((m) => m.id === selectedId);
      onChanged(selectedId, model?.name ?? selectedId);
    } catch (e) {
      console.error("Failed to apply model:", e);
    } finally {
      setApplying(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Change Speech Model">
      <p className="text-sm text-text-secondary mb-4">
        Choose a speech recognition model. It runs locally on your device.
      </p>

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory mb-4">
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

      {error && <p className="text-sm text-error mb-4">{error}</p>}

      <div className="flex justify-end gap-3">
        {downloading ? (
          <Button variant="ghost" size="sm" onClick={cancel}>
            Cancel download
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Back
          </Button>
        )}
        {isDownloaded && !downloading ? (
          <Button
            size="sm"
            onClick={handleApply}
            disabled={applying || isCurrentModel}
          >
            {applying ? "Applying\u2026" : "Apply"}
          </Button>
        ) : (
          <button
            className={cn(
              "relative inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 cursor-pointer rounded-lg px-3 py-1 text-sm overflow-hidden",
              downloading
                ? "bg-bg-tertiary text-text-secondary cursor-default"
                : "bg-accent text-white hover:bg-accent-hover active:bg-accent-hover/90",
            )}
            disabled={downloading}
            onClick={() => startDownload(selectedId)}
          >
            {downloading && (
              <span
                className="absolute inset-0 bg-accent/20 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            )}
            <span className="relative">
              {downloading ? `Downloading\u2026 ${pct}%` : "Download & Apply"}
            </span>
          </button>
        )}
      </div>
    </Modal>
  );
}
