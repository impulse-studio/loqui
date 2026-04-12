import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAudioDevices,
  startRecording,
  stopRecording,
  type AudioDevice,
} from "../../shared/lib/tauri-commands";
import { useTauriEvent } from "../../shared/hooks/use-tauri-event";
import {
  EVENTS,
  type AudioLevelPayload,
} from "../../shared/lib/tauri-events";
import { useAgentStore } from "../../shared/stores/agent-store";
import cn from "../../shared/lib/utils/cn";
import type { StepComponentProps } from "../step-registry";

export default function StepMicrophone({ goNext, setFooter }: StepComponentProps) {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("default");
  const [testing, setTesting] = useState(false);
  const [level, setLevel] = useState(0);
  const [debug, setDebug] = useState({ rms: 0, db: -100, chunkSize: 0 });
  const updateConfig = useAgentStore((s) => s.updateConfig);
  const testingRef = useRef(false);

  // Load devices on mount
  useEffect(() => {
    getAudioDevices()
      .then((devs) => {
        setDevices(devs);
        const defaultDev = devs.find((d) => d.isDefault);
        if (defaultDev) {
          setSelectedDevice(defaultDev.name);
        }
      })
      .catch(console.error);
  }, []);

  // Listen for audio levels during test — stable callback avoids listener re-registration gap
  const handleAudioLevel = useCallback(
    (payload: AudioLevelPayload) => {
      if (testingRef.current) {
        setLevel(payload.level);
        setDebug({ rms: payload.rms, db: payload.db, chunkSize: payload.chunkSize });
      }
    },
    [],
  );
  useTauriEvent(EVENTS.AUDIO_LEVEL, handleAudioLevel);

  // Save selection and advance
  const handleContinue = useCallback(() => {
    updateConfig("microphoneDevice", selectedDevice);
    goNext();
  }, [selectedDevice, updateConfig, goNext]);

  // Footer
  useEffect(() => {
    setFooter({
      label: "Continue",
      onClick: handleContinue,
      disabled: false,
    });
  }, [handleContinue, setFooter]);

  async function handleTest() {
    if (testing) {
      testingRef.current = false;
      setTesting(false);
      setLevel(0);
      try {
        await stopRecording();
      } catch {
        // ignore — may not have started properly
      }
      return;
    }

    // Save device selection before testing so Rust picks it up
    updateConfig("microphoneDevice", selectedDevice);

    // Small delay for config write to propagate
    await new Promise((r) => setTimeout(r, 100));

    testingRef.current = true;
    setTesting(true);
    try {
      await startRecording();
    } catch (err) {
      console.error("Failed to start recording:", err);
      testingRef.current = false;
      setTesting(false);
    }
  }

  function handleDeviceChange(name: string) {
    setSelectedDevice(name);
    if (testing) {
      testingRef.current = false;
      setTesting(false);
      setLevel(0);
      stopRecording().catch(() => {});
    }
  }

  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        Select Microphone
      </h2>
      <p className="text-sm text-text-secondary mb-6">
        Choose the microphone you want to use for dictation.
      </p>

      <div className="flex flex-col gap-2 mb-6">
        {devices.map((device) => (
          <button
            key={device.name}
            onClick={() => handleDeviceChange(device.name)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors",
              selectedDevice === device.name
                ? "border-accent bg-accent-subtle"
                : "border-border bg-bg-card hover:border-text-tertiary",
            )}
          >
            <div
              className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                selectedDevice === device.name
                  ? "border-accent"
                  : "border-text-tertiary",
              )}
            >
              {selectedDevice === device.name && (
                <div className="w-2 h-2 rounded-full bg-accent" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-text-primary truncate">
                {device.name}
              </div>
              {device.isDefault && (
                <div className="text-xs text-text-tertiary">System default</div>
              )}
            </div>
          </button>
        ))}

        {devices.length === 0 && (
          <div className="text-sm text-text-tertiary py-4">
            No microphones found
          </div>
        )}
      </div>

      {/* Test button + level meter */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleTest}
          disabled={devices.length === 0}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
            testing
              ? "bg-error text-white hover:bg-error/90"
              : "bg-bg-tertiary text-text-primary hover:bg-bg-card",
            devices.length === 0 && "opacity-50 cursor-not-allowed",
          )}
        >
          {testing ? "Stop Test" : "Test Microphone"}
        </button>

        <div className="flex-1 h-3 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-75"
            style={{ width: `${Math.min(level * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Debug info */}
      {testing && (
        <div className="mt-3 text-left font-mono text-xs text-text-tertiary bg-bg-tertiary rounded-lg p-3 space-y-1">
          <div>RMS: {debug.rms.toFixed(6)}</div>
          <div>dB: {debug.db.toFixed(1)}</div>
          <div>Level: {(level * 100).toFixed(1)}%</div>
          <div>Chunk size: {debug.chunkSize}</div>
        </div>
      )}
    </div>
  );
}
