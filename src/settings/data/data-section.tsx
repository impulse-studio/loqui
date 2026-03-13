import { useCallback, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import Card from "../../shared/components/card";
import Button from "../../shared/components/button";
import Modal from "../../shared/components/modal";
import Select from "../../shared/components/select";
import {
  setConfig,
  exportTranscripts,
  clearAllData,
} from "../../shared/lib/tauri-commands";
import retentionOptions from "./retention-options";
import useSettingsConfig from "../use-settings-config";

export default function DataSection() {
  const [retention, setRetention] = useState("unlimited");
  const [exporting, setExporting] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  useSettingsConfig((cfg) => {
    if (cfg.transcriptRetention) {
      setRetention(cfg.transcriptRetention);
    }
  });

  const handleExport = useCallback(async () => {
    const path = await save({
      defaultPath: "loqui-transcripts.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!path) return;
    setExporting(true);
    try {
      await exportTranscripts(path);
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setExporting(false);
    }
  }, []);

  const handleClear = useCallback(async () => {
    setClearing(true);
    try {
      await clearAllData();
      setConfirmClear(false);
    } catch (e) {
      console.error("Clear failed:", e);
    } finally {
      setClearing(false);
    }
  }, []);

  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold mb-3">Data</h2>
      <Card className="divide-y divide-border">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm">Transcript retention</span>
          <Select
            options={retentionOptions}
            value={retention}
            onChange={(val) => {
              setRetention(val);
              setConfig("transcriptRetention", val);
            }}
          />
        </div>

        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <div className="text-sm font-medium">Export transcripts</div>
            <div className="text-xs text-text-secondary">
              Save all transcripts as JSON
            </div>
          </div>
          <Button size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? "Exporting\u2026" : "Export"}
          </Button>
        </div>

        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <div className="text-sm font-medium text-error">Clear all data</div>
            <div className="text-xs text-text-secondary">
              Permanently delete all transcripts and settings
            </div>
          </div>
          <button
            onClick={() => setConfirmClear(true)}
            className="text-xs text-error font-medium border border-error/40 rounded-lg px-3 py-1.5 hover:bg-error/10 transition-colors"
          >
            Clear
          </button>
        </div>
      </Card>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear all data?"
      >
        <p className="text-sm text-text-secondary mb-6">
          This will permanently delete all transcripts, profiles, and settings.
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmClear(false)}
          >
            Cancel
          </Button>
          <button
            onClick={handleClear}
            disabled={clearing}
            className="text-xs text-white font-medium bg-error rounded-lg px-4 py-2 hover:bg-error/90 transition-colors disabled:opacity-50"
          >
            {clearing ? "Clearing\u2026" : "Delete everything"}
          </button>
        </div>
      </Modal>
    </section>
  );
}
