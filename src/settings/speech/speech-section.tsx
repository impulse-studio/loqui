import { useEffect, useState } from "react";
import Card from "../../shared/components/card";
import { DEFAULT_CONFIG } from "../../shared/types/config";
import {
  getAudioDevices,
  getModels,
  setConfig,
  type AudioDevice,
} from "../../shared/lib/tauri-commands";
import tierLabels from "../../shared/components/model-card/tier-labels";
import useSettingsConfig from "../use-settings-config";
import SpeechModelModal from "./speech-model-modal";

export default function SpeechSection() {
  const [modelId, setModelId] = useState(DEFAULT_CONFIG.sttModel!);
  const [modelName, setModelName] = useState("\u2014");
  const [showModelModal, setShowModelModal] = useState(false);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("default");

  useSettingsConfig((cfg) => {
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

  function handleDeviceChange(name: string) {
    setSelectedDevice(name);
    setConfig("microphoneDevice", name).catch(console.error);
  }

  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold mb-3">Speech Recognition</h2>
      <Card className="divide-y divide-border">
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
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <div className="text-sm font-medium">Microphone</div>
            <div className="text-xs text-text-secondary">Input device for dictation</div>
          </div>
          <select
            value={selectedDevice}
            onChange={(e) => handleDeviceChange(e.target.value)}
            className="text-sm bg-bg-tertiary text-text-primary border border-border rounded-lg px-3 py-1.5 max-w-[220px] truncate focus:outline-none focus:border-accent"
          >
            {devices.map((device) => (
              <option key={device.name} value={device.name}>
                {device.name}{device.isDefault ? " (Default)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm">Language</span>
          <span className="text-sm text-text-secondary">Auto-detect</span>
        </div>
      </Card>

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
