import { useCallback, useState } from "react";
import Card from "../../shared/components/card";
import Toggle from "../../shared/components/toggle";
import Select from "../../shared/components/select";
import {
  setConfig,
  applyWidgetSettings,
} from "../../shared/lib/tauri-commands";
import widgetPositionOptions from "./widget-position-options";
import useSettingsConfig from "../use-settings-config";

export default function WidgetSection() {
  const [visible, setVisible] = useState(true);
  const [position, setPosition] = useState("bottom-center");

  useSettingsConfig((cfg) => {
    if (cfg.widgetVisible !== undefined) setVisible(cfg.widgetVisible !== "false");
    if (cfg.widgetPosition) setPosition(cfg.widgetPosition);
  });

  const applyAndSave = useCallback(
    async (key: string, value: string) => {
      await setConfig(key, value);
      await applyWidgetSettings();
    },
    [],
  );

  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold mb-3">Widget</h2>
      <Card className="divide-y divide-border">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm">Show widget</span>
          <Toggle
            checked={visible}
            onChange={(v) => {
              setVisible(v);
              applyAndSave("widgetVisible", String(v));
            }}
          />
        </div>

        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm">Position</span>
          <Select
            options={widgetPositionOptions}
            value={position}
            onChange={(val) => {
              setPosition(val);
              applyAndSave("widgetPosition", val);
            }}
          />
        </div>
      </Card>
    </section>
  );
}
