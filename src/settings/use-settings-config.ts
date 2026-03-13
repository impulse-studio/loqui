import { useEffect, useState } from "react";
import { getConfig } from "../shared/lib/tauri-commands";

export default function useSettingsConfig(
  apply: (cfg: Record<string, string>) => void,
) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getConfig().then((cfg) => {
      apply(cfg);
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return loaded;
}
