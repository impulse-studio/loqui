import { useCallback, useState } from "react";
import { useTauriEvent } from "./use-tauri-event";
import { EVENTS, type DownloadProgressPayload } from "../lib/tauri-events";
import {
  downloadModel,
  cancelDownload,
  getModels,
  type ModelStatus,
} from "../lib/tauri-commands";

interface UseDownloadEventsReturn {
  downloading: boolean;
  progress: DownloadProgressPayload | null;
  error: string | null;
  pct: number;
  startDownload: (modelId: string) => Promise<void>;
  cancel: () => Promise<void>;
  refreshModels: () => Promise<ModelStatus[]>;
}

export default function useDownloadEvents(
  onComplete?: () => void,
): UseDownloadEventsReturn {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgressPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProgress = useCallback((payload: DownloadProgressPayload) => {
    setProgress(payload);
  }, []);
  useTauriEvent(EVENTS.DOWNLOAD_PROGRESS, handleProgress);

  const handleComplete = useCallback(() => {
    setDownloading(false);
    setProgress(null);
    onComplete?.();
  }, [onComplete]);
  useTauriEvent(EVENTS.DOWNLOAD_COMPLETE, handleComplete);

  const handleError = useCallback((payload: { error: string }) => {
    setDownloading(false);
    setProgress(null);
    setError(payload.error);
  }, []);
  useTauriEvent(EVENTS.DOWNLOAD_ERROR, handleError);

  const startDownload = useCallback(async (modelId: string) => {
    setError(null);
    setDownloading(true);
    try {
      await downloadModel(modelId);
    } catch (e) {
      setDownloading(false);
      setError(String(e));
    }
  }, []);

  const cancel = useCallback(async () => {
    try {
      await cancelDownload();
    } catch {
      /* ignore */
    }
    setDownloading(false);
    setProgress(null);
  }, []);

  const pct =
    downloading && progress && progress.total > 0
      ? Math.round((progress.downloaded / progress.total) * 100)
      : 0;

  return { downloading, progress, error, pct, startDownload, cancel, refreshModels: getModels };
}
