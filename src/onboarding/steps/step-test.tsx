import { useCallback, useEffect, useState } from "react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useTauriEvent } from "../../shared/hooks/use-tauri-event";
import { loadSttModel } from "../../shared/lib/tauri-commands";
import {
  EVENTS,
  type ModelLoadedPayload,
  type TranscriptionCompletePayload,
} from "../../shared/lib/tauri-events";
import { DEFAULT_CONFIG } from "../../shared/types/config";
import { useAgentStore } from "../../shared/stores/agent-store";
import type { StepComponentProps } from "../step-registry";

export default function StepTest({ goNext, setFooter }: StepComponentProps) {
  const [text, setText] = useState("");
  const [modelReady, setModelReady] = useState(false);
  const config = useAgentStore((s) => s.config);

  // Show widget on mount, hide on unmount
  useEffect(() => {
    WebviewWindow.getByLabel("widget").then((w) => w?.show()).catch(console.error);
    return () => {
      WebviewWindow.getByLabel("widget").then((w) => w?.hide()).catch(console.error);
    };
  }, []);

  // Safety net: trigger model load (no-op if already loaded, re-emits model-loaded)
  useEffect(() => {
    const modelId = config.sttModel || DEFAULT_CONFIG.sttModel!;
    loadSttModel(modelId)
      .then(() => setModelReady(true))
      .catch(console.error);
  }, [config.sttModel]);

  // Listen for model-loaded from Rust
  const handleModelLoaded = useCallback((_payload: ModelLoadedPayload) => {
    setModelReady(true);
  }, []);
  useTauriEvent(EVENTS.MODEL_LOADED, handleModelLoaded);

  // Listen for transcription-complete from widget
  const handleTranscription = useCallback(
    (payload: TranscriptionCompletePayload) => {
      if (payload.text) {
        setText((prev) => (prev ? prev + "\n" + payload.text : payload.text));
      }
    },
    [],
  );
  useTauriEvent(EVENTS.TRANSCRIPTION_COMPLETE, handleTranscription);

  // Footer: Continue enabled when textarea has content
  useEffect(() => {
    setFooter({
      label: "Continue",
      onClick: goNext,
      disabled: text.trim().length === 0,
    });
  }, [text, goNext, setFooter]);

  return (
    <div>
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        Test Dictation
      </h2>
      <p className="text-sm text-text-secondary mb-6">
        Hold your hotkey and speak. The widget will show recording status.
      </p>

      {!modelReady && (
        <div className="flex items-center gap-3 text-text-secondary mb-4">
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading model...</span>
        </div>
      )}

      <textarea
        value={text}
        readOnly
        placeholder="Transcribed text will appear here..."
        className="
          w-full h-40 p-4 rounded-lg
          bg-bg-card border border-border
          text-sm text-text-primary leading-relaxed
          resize-none focus:outline-none focus:border-accent
          placeholder:text-text-tertiary
        "
      />

      {text.length > 0 && (
        <button
          onClick={() => setText("")}
          className="text-xs text-text-tertiary hover:text-error transition-colors mt-2"
        >
          Clear
        </button>
      )}
    </div>
  );
}
