import { useCallback, useEffect, useState } from "react";
import Card from "../../shared/components/card";
import Toggle from "../../shared/components/toggle";
import {
  setConfig,
  enableAutostart,
  disableAutostart,
  isAutostartEnabled,
} from "../../shared/lib/tauri-commands";
import HotkeyDisplay from "./hotkey-display";
import HotkeyRecordModal from "./hotkey-record-modal";
import useSettingsConfig from "../use-settings-config";

export default function GeneralSection() {
  const [hotkey, setHotkey] = useState("shift+alt");
  const [launchAtStartup, setLaunchAtStartup] = useState(false);
  const [copyToClipboard, setCopyToClipboard] = useState(true);
  const [showHotkeyModal, setShowHotkeyModal] = useState(false);

  useSettingsConfig((cfg) => {
    if (cfg.hotkey) setHotkey(cfg.hotkey);
    if (cfg.copyToClipboard) setCopyToClipboard(cfg.copyToClipboard !== "false");
  });

  useEffect(() => {
    isAutostartEnabled().then(setLaunchAtStartup).catch(console.error);
  }, []);

  const handleToggleStartup = useCallback((v: boolean) => {
    setLaunchAtStartup(v);
    const action = v ? enableAutostart() : disableAutostart();
    action.catch((e) => {
      console.error("Autostart toggle failed:", e);
      setLaunchAtStartup(!v);
    });
  }, []);

  const handleToggleCopyToClipboard = useCallback((v: boolean) => {
    setCopyToClipboard(v);
    setConfig("copyToClipboard", String(v));
  }, []);

  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold mb-3">General</h2>
      <Card className="divide-y divide-border">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <div className="text-sm font-medium">Hotkey</div>
            <div className="text-xs text-text-secondary">
              Hold to start dictating
            </div>
          </div>
          <div className="flex items-center gap-3">
            <HotkeyDisplay hotkey={hotkey} />
            <button
              onClick={() => setShowHotkeyModal(true)}
              className="text-xs text-accent font-medium hover:underline"
            >
              Change
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <div className="text-sm font-medium">Copy to clipboard</div>
            <div className="text-xs text-text-secondary">
              Keep transcript in clipboard after pasting
            </div>
          </div>
          <Toggle
            checked={copyToClipboard}
            onChange={handleToggleCopyToClipboard}
          />
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm">Launch at startup</span>
          <Toggle
            checked={launchAtStartup}
            onChange={handleToggleStartup}
          />
        </div>
      </Card>

      <HotkeyRecordModal
        open={showHotkeyModal}
        currentHotkey={hotkey}
        onClose={() => setShowHotkeyModal(false)}
        onSaved={(newHotkey) => {
          setHotkey(newHotkey);
          setShowHotkeyModal(false);
        }}
      />
    </section>
  );
}
