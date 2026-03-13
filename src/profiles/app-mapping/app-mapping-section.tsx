import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { getDetectedApps } from "../../shared/lib/tauri-commands";
import appMappingConstants from "./app-mapping-constants";
import cn from "../../shared/lib/utils/cn";

interface AppMappingSectionProps {
  appMappings: string;
  isDefault: boolean;
  onChange: (appMappings: string) => void;
}

export default function AppMappingSection({
  appMappings,
  isDefault,
  onChange,
}: AppMappingSectionProps) {
  const [detectedApps, setDetectedApps] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getDetectedApps()
      .then(setDetectedApps)
      .catch(() => setDetectedApps([]));
  }, []);

  const checked: string[] = useMemo(() => {
    try {
      return JSON.parse(appMappings);
    } catch {
      return [];
    }
  }, [appMappings]);

  const visibleApps = useMemo(() => {
    const allApps = [...new Set([...checked, ...detectedApps])];
    const query = search.trim().toLowerCase();

    const selectedSorted = checked
      .filter((app) => !query || app.toLowerCase().includes(query))
      .sort((a, b) => a.localeCompare(b));

    const unselectedSorted = allApps
      .filter((app) => !checked.includes(app))
      .filter((app) => !query || app.toLowerCase().includes(query))
      .sort((a, b) => a.localeCompare(b));

    if (query) {
      return [...selectedSorted, ...unselectedSorted];
    }

    const minVisible = appMappingConstants.suggestionLimit;
    const slotsForUnselected = Math.max(0, minVisible - selectedSorted.length);
    return [...selectedSorted, ...unselectedSorted.slice(0, slotsForUnselected)];
  }, [checked, detectedApps, search]);

  function toggleApp(app: string) {
    const isChecked = checked.includes(app);
    const next = isChecked
      ? checked.filter((a) => a !== app)
      : [...checked, app];
    onChange(JSON.stringify(next));
  }

  const hasNoApps = detectedApps.length === 0 && checked.length === 0;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text-primary">
        App Mappings
      </label>

      {isDefault ? (
        <p className="text-xs text-text-tertiary">
          This is the default profile — it applies to all unmapped apps.
        </p>
      ) : hasNoApps ? (
        <p className="text-xs text-text-tertiary">
          No apps detected yet. Use dictation first.
        </p>
      ) : (
        <div className="space-y-1">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
            />
            <input
              type="text"
              placeholder="Search apps..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-bg-secondary text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {visibleApps.map((app) => (
            <label
              key={app}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg-secondary cursor-pointer"
            >
              <input
                type="checkbox"
                checked={checked.includes(app)}
                onChange={() => toggleApp(app)}
                className="accent-accent"
              />
              <span className={cn("text-sm", checked.includes(app) ? "text-text-primary" : "text-text-secondary")}>
                {app}
              </span>
            </label>
          ))}

          {search.trim() && visibleApps.length === 0 && (
            <p className="text-xs text-text-tertiary px-3 py-2">
              No matching apps.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
