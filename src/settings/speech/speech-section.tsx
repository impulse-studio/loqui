import { useState } from "react";
import Card from "../../shared/components/card";
import { DEFAULT_CONFIG } from "../../shared/types/config";
import { getModels } from "../../shared/lib/tauri-commands";
import tierLabels from "../../shared/components/model-card/tier-labels";
import useSettingsConfig from "../use-settings-config";
import SpeechModelModal from "./speech-model-modal";

export default function SpeechSection() {
  const [modelId, setModelId] = useState(DEFAULT_CONFIG.sttModel!);
  const [modelName, setModelName] = useState("\u2014");
  const [showModelModal, setShowModelModal] = useState(false);

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
  });

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
