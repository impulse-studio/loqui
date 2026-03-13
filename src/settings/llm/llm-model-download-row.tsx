import { useState } from "react";
import { Download, Check, Loader, Cpu, X } from "lucide-react";
import Button from "../../shared/components/button";
import type { LlmModelStatus } from "../../shared/types/llm";
import type { DownloadProgress } from "../../shared/types/config";
import {
  downloadLlmModel,
  cancelLlmDownload,
  loadLlmModel,
} from "../../shared/lib/tauri-commands";
import formatSize from "../../shared/lib/utils/format-size";

interface LlmModelDownloadRowProps {
  model: LlmModelStatus;
  loadedId: string | null;
  progress: DownloadProgress | null;
  onDownloadDone: () => void;
}

export default function LlmModelDownloadRow({
  model,
  loadedId,
  progress,
  onDownloadDone,
}: LlmModelDownloadRowProps) {
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(false);
  const isLoaded = loadedId === model.id;
  const hasProgress = downloading && progress?.modelId === model.id;

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadLlmModel(model.id);
      onDownloadDone();
    } catch {
      // download-error event will handle this
    } finally {
      setDownloading(false);
    }
  }

  async function handleCancel() {
    await cancelLlmDownload();
    setDownloading(false);
  }

  async function handleLoad() {
    setLoading(true);
    try {
      await loadLlmModel(model.id);
    } catch (e) {
      console.error("Failed to load LLM model:", e);
    } finally {
      setLoading(false);
    }
  }

  const percent =
    hasProgress && progress
      ? Math.round((progress.downloaded / progress.total) * 100)
      : 0;

  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary">
          {model.name}
        </div>
        <div className="text-xs text-text-secondary">
          {model.description} &middot; {formatSize(model.size)}
        </div>
        {downloading && !hasProgress && (
          <div className="flex items-center gap-2 mt-2 text-xs text-text-tertiary">
            <Loader size={12} className="animate-spin" />
            Connecting...
          </div>
        )}
        {hasProgress && progress && (
          <div className="mt-2 space-y-1">
            <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="text-xs text-text-tertiary">
              {percent}% &middot; {formatSize(progress.speed)}/s
            </div>
          </div>
        )}
      </div>

      <div className="ml-4 shrink-0">
        {!model.downloaded && !downloading && (
          <Button variant="secondary" size="sm" onClick={handleDownload}>
            <Download size={14} />
            Download
          </Button>
        )}
        {downloading && (
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X size={14} />
            Cancel
          </Button>
        )}
        {model.downloaded && !isLoaded && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLoad}
            disabled={loading}
          >
            {loading ? (
              <Loader size={14} className="animate-spin" />
            ) : (
              <Cpu size={14} />
            )}
            Load
          </Button>
        )}
        {model.downloaded && isLoaded && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
            <Check size={14} />
            Loaded
          </span>
        )}
      </div>
    </div>
  );
}
