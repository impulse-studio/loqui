import { useCallback, useEffect, useRef, useState } from "react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useTauriEvent } from "../../shared/hooks/use-tauri-event";
import { loadSttModel, setHotkey, startRecording, stopRecording } from "../../shared/lib/tauri-commands";
import {
  EVENTS,
  type ModelLoadedPayload,
} from "../../shared/lib/tauri-events";
import { DEFAULT_CONFIG, type AgentState } from "../../shared/types/config";
import { useAgentStore } from "../../shared/stores/agent-store";
import parseShortcutDisplay from "../../shared/lib/hotkey/parse-shortcut-display";
import type { StepComponentProps } from "../step-registry";
import eventKeyName from "./event-key-name";

export default function StepTest({ goNext, setFooter }: StepComponentProps) {
  const [text, setText] = useState("");
  const [modelReady, setModelReady] = useState(false);
  const [status, setStatus] = useState<AgentState>("idle");
  const isRecordingRef = useRef(false);
  const pressedKeys = useRef(new Set<string>());
  const config = useAgentStore((s) => s.config);

  const hotkey = config.hotkey || DEFAULT_CONFIG.hotkey!;
  const hotkeyKeys = parseShortcutDisplay(hotkey);

  // Disable rdev global listener while on this step (we handle keys locally
  // so the hotkey works even when the app is focused). Restore on unmount.
  useEffect(() => {
    setHotkey("").catch(console.error);
    return () => { setHotkey(hotkey).catch(console.error); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show widget on mount, hide on unmount
  useEffect(() => {
    WebviewWindow.getByLabel("widget").then((w) => w?.show()).catch(console.error);
    return () => {
      WebviewWindow.getByLabel("widget").then((w) => w?.hide()).catch(console.error);
    };
  }, []);

  // Load model
  useEffect(() => {
    const modelId = config.sttModel || DEFAULT_CONFIG.sttModel!;
    loadSttModel(modelId)
      .then(() => setModelReady(true))
      .catch(console.error);
  }, [config.sttModel]);

  const handleModelLoaded = useCallback((_: ModelLoadedPayload) => {
    setModelReady(true);
  }, []);
  useTauriEvent(EVENTS.MODEL_LOADED, handleModelLoaded);

  // Browser-level keyboard handler — works even when app has focus
  useEffect(() => {
    if (!modelReady) return;

    const hotkeySet = new Set(
      hotkey.toLowerCase().split("+").map((k) => k.trim()).filter(Boolean)
    );

    const handleKeyDown = async (e: KeyboardEvent) => {
      pressedKeys.current.add(eventKeyName(e));
      const allPressed = [...hotkeySet].every((k) => pressedKeys.current.has(k));
      if (allPressed && !isRecordingRef.current) {
        isRecordingRef.current = true;
        e.preventDefault();
        setStatus("recording");
        try {
          await startRecording();
        } catch {
          isRecordingRef.current = false;
          setStatus("idle");
        }
      }
    };

    const handleKeyUp = async (e: KeyboardEvent) => {
      pressedKeys.current.delete(eventKeyName(e));
      const stillActive = [...hotkeySet].every((k) => pressedKeys.current.has(k));
      if (!stillActive && isRecordingRef.current) {
        isRecordingRef.current = false;
        setStatus("processing");
        try {
          const result = await stopRecording();
          const clean = result.text?.trim().replace(/^\[BLANK_AUDIO\]$/i, "") ?? "";
          if (clean) setText((prev) => (prev ? prev + "\n" + clean : clean));
          setStatus("idle");
        } catch (err) {
          console.error(err);
          setStatus("error");
          setTimeout(() => setStatus("idle"), 2000);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [modelReady, hotkey]);

  // Footer
  useEffect(() => {
    setFooter({ label: "Continue", onClick: goNext, disabled: text.trim().length === 0 });
  }, [text, goNext, setFooter]);

  return (
    <div>
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        Test Dictation
      </h2>
      <p className="text-sm text-text-secondary mb-2">
        Hold your hotkey, speak, then release.
      </p>

      {/* Hotkey reminder */}
      <div className="flex items-center gap-1.5 mb-6 flex-wrap">
        <span className="text-xs text-text-tertiary mr-1">Your hotkey:</span>
        {hotkeyKeys.map((k, i) => (
          <span key={k.label} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-xs text-text-tertiary">+</span>}
            <kbd className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-bg-card border border-border text-xs font-medium text-text-secondary">
              {k.symbol && <span className="opacity-60">{k.symbol}</span>}
              {k.label}
            </kbd>
          </span>
        ))}
      </div>

      {/* Status */}
      <div className="mb-4">
        {!modelReady ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-bg-card border border-border text-text-secondary">
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span className="text-sm">Loading speech model…</span>
          </div>
        ) : status === "recording" ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-error/10 border border-error/30 text-error">
            <div className="w-3 h-3 rounded-full bg-error animate-pulse flex-shrink-0" />
            <span className="text-sm font-medium">Recording… release to transcribe</span>
          </div>
        ) : status === "processing" ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/10 border border-accent/30 text-accent">
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span className="text-sm">Transcribing…</span>
          </div>
        ) : status === "error" ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-error/10 border border-error/30 text-error">
            <span className="text-sm">Something went wrong — try again</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-bg-card border border-border text-text-tertiary">
            <span className="text-sm">Hold your hotkey and speak…</span>
          </div>
        )}
      </div>

      <textarea
        value={text}
        readOnly
        placeholder="Transcribed text will appear here…"
        className="
          w-full h-36 p-4 rounded-lg
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
