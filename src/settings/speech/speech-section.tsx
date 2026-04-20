import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "../../shared/components/card";
import Select from "../../shared/components/select";
import { DEFAULT_CONFIG, type SttProvider } from "../../shared/types/config";
import {
  getAudioDevices,
  getModels,
  setConfig,
  type AudioDevice,
} from "../../shared/lib/tauri-commands";
import tierLabels from "../../shared/components/model-card/tier-labels";
import useSettingsConfig from "../use-settings-config";
import SpeechModelModal from "./speech-model-modal";
import CloudProviderPicker from "../../shared/components/cloud-provider-picker";
import cn from "../../shared/lib/utils/cn";

type Mode = "local" | "cloud";

export default function SpeechSection() {
  const [mode, setMode] = useState<Mode>("local");
  const [provider, setProvider] = useState<SttProvider>("local");
  const [remoteModel, setRemoteModel] = useState("");
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [modelId, setModelId] = useState(DEFAULT_CONFIG.sttModel!);
  const [modelName, setModelName] = useState("\u2014");
  const [showModelModal, setShowModelModal] = useState(false);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("default");

  useSettingsConfig((cfg) => {
    const nextProvider = (cfg.sttProvider as SttProvider) ?? "local";
    setProvider(nextProvider);
    setMode(nextProvider === "local" ? "local" : "cloud");
    setRemoteModel(cfg.sttRemoteModel ?? "");
    setCustomEndpoint(cfg.sttCustomEndpoint ?? "");

    if (cfg.sttModel) {
      setModelId(cfg.sttModel);
      getModels().then((models) => {
        const m = models.find((mod) => mod.id === cfg.sttModel);
        if (m) {
          const tier = tierLabels[m.accuracyTier] ?? m.accuracyTier;
          setModelName(`${m.name} (${tier})`);
        }
      });
    }
    if (cfg.microphoneDevice) {
      setSelectedDevice(cfg.microphoneDevice);
    }
  });

  useEffect(() => {
    getAudioDevices()
      .then(setDevices)
      .catch(console.error);
  }, []);

  const deviceOptions = useMemo(
    () =>
      devices.map((d) => ({
        value: d.name,
        label: d.isDefault ? `${d.name} (Default)` : d.name,
      })),
    [devices],
  );

  const handleDeviceChange = useCallback((name: string) => {
    setSelectedDevice(name);
    setConfig("microphoneDevice", name).catch(console.error);
  }, []);

  const switchToLocal = useCallback(async () => {
    setMode("local");
    await setConfig("sttProvider", "local");
    await setConfig("sttRemoteModel", "");
    await setConfig("sttCustomEndpoint", "");
    setProvider("local");
    setRemoteModel("");
    setCustomEndpoint("");
  }, []);

  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold mb-3">Speech Recognition</h2>

      <div className="space-y-3">
        <Card className="divide-y divide-border">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="text-sm font-medium">Transcription mode</div>
              <div className="text-xs text-text-secondary">
                {mode === "local"
                  ? "Runs fully on your device"
                  : "Audio is sent to your chosen provider"}
              </div>
            </div>
            <div className="flex gap-1 rounded-lg border border-border p-0.5">
              <button
                type="button"
                onClick={() => {
                  setMode("local");
                  switchToLocal().catch(console.error);
                }}
                className={cn(
                  "px-3 h-7 rounded-md text-xs font-medium transition-colors cursor-pointer",
                  mode === "local"
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                Local
              </button>
              <button
                type="button"
                onClick={() => setMode("cloud")}
                className={cn(
                  "px-3 h-7 rounded-md text-xs font-medium transition-colors cursor-pointer",
                  mode === "cloud"
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                Cloud
              </button>
            </div>
          </div>

          {mode === "local" ? (
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="text-sm font-medium">Current model</div>
                <div className="text-xs text-text-secondary">{modelName}</div>
              </div>
              <button
                onClick={() => setShowModelModal(true)}
                className="text-xs text-accent font-medium border border-accent rounded-lg px-3 py-1.5 hover:bg-accent-subtle"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="px-5 py-4">
              <CloudProviderPicker
                initialProvider={provider}
                initialModel={remoteModel}
                initialCustomEndpoint={customEndpoint}
              />
            </div>
          )}
        </Card>

        <Card className="flex items-center justify-between px-5 py-4">
          <div>
            <div className="text-sm font-medium">Microphone</div>
            <div className="text-xs text-text-secondary">
              Input device for dictation
            </div>
          </div>
          <Select
            options={deviceOptions}
            value={selectedDevice}
            onChange={handleDeviceChange}
            placeholder="Select device"
          />
        </Card>
      </div>

      <SpeechModelModal
        open={showModelModal}
        currentModelId={modelId}
        onClose={() => setShowModelModal(false)}
        onChanged={(id, name) => {
          setModelId(id);
          getModels().then((models) => {
            const m = models.find((mod) => mod.id === id);
            if (m) {
              const tier = tierLabels[m.accuracyTier] ?? m.accuracyTier;
              setModelName(`${m.name} (${tier})`);
            } else {
              setModelName(name);
            }
          });
          setShowModelModal(false);
        }}
      />
    </section>
  );
}
