import { useCallback, useEffect, useState } from "react";
import { setHotkey } from "../../shared/lib/tauri-commands";
import { DEFAULT_CONFIG } from "../../shared/types/config";
import { useAgentStore } from "../../shared/stores/agent-store";
import KeyCap from "../../shared/components/key-cap";
import parseShortcutDisplay from "../../shared/lib/hotkey/parse-shortcut-display";
import useHotkeyRecorder from "../../shared/lib/hotkey/use-hotkey-recorder";
import type { StepComponentProps } from "../step-registry";

export default function StepHotkey({ goNext, setFooter }: StepComponentProps) {
  const config = useAgentStore((s) => s.config);
  const updateConfig = useAgentStore((s) => s.updateConfig);
  const [shortcut, setShortcut] = useState(config.hotkey || DEFAULT_CONFIG.hotkey!);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { liveKeys, result, reset } = useHotkeyRecorder(recording);

  useEffect(() => {
    if (result) {
      setShortcut(result);
      setRecording(false);
    }
  }, [result]);

  const displayKeys = parseShortcutDisplay(shortcut);

  const handleContinue = useCallback(async () => {
    setError(null);
    try {
      await setHotkey(shortcut);
      updateConfig("hotkey", shortcut);
      goNext();
    } catch (e) {
      setError(String(e));
    }
  }, [shortcut, updateConfig, goNext]);

  useEffect(() => {
    setFooter({
      label: "Continue",
      onClick: handleContinue,
      disabled: recording,
    });
  }, [recording, handleContinue, setFooter]);

  const liveDisplay = liveKeys.length > 0
    ? parseShortcutDisplay(liveKeys.join("+"))
    : [];

  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        Set Your Hotkey
      </h2>
      <p className="text-sm text-text-secondary mb-8">
        Press and hold this shortcut to record, release to transcribe.
      </p>

      <div className="flex flex-col items-center gap-5 mb-6">
        {recording ? (
          liveKeys.length > 0 ? (
            <div className="flex items-center gap-3">
              {liveDisplay.map((k, i) => (
                <div key={k.label} className="flex items-center gap-3">
                  {i > 0 && <span className="text-lg text-text-tertiary">+</span>}
                  <KeyCap label={k.label} symbol={k.symbol} size="lg" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[100px] px-8 rounded-2xl border-2 border-accent border-dashed bg-accent/5">
              <span className="text-base text-accent animate-pulse">
                Press any key combination...
              </span>
            </div>
          )
        ) : (
          <div className="flex items-center gap-3">
            {displayKeys.map((k, i) => (
              <div key={k.label} className="flex items-center gap-3">
                {i > 0 && <span className="text-lg text-text-tertiary">+</span>}
                <KeyCap label={k.label} symbol={k.symbol} size="lg" />
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            if (recording) reset();
            setRecording(!recording);
          }}
          className="px-4 py-1.5 text-sm text-text-secondary border border-border rounded-lg hover:border-text-tertiary hover:text-text-primary transition-colors"
        >
          {recording ? "Cancel" : "Change Hotkey"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-error text-center">{error}</p>
      )}
    </div>
  );
}
