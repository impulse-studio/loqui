import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Select from "../select";
import cn from "../../lib/utils/cn";
import {
  hasSttApiKey,
  saveSttApiKey,
  setConfig,
  testSttProvider,
} from "../../lib/tauri-commands";
import type { SttProvider } from "../../types/config";
import remoteProviderConfig, {
  type RemoteSttProvider,
} from "./remote-provider-config";

type TestStatus =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "ok" }
  | { kind: "error"; message: string };

interface CloudProviderPickerProps {
  initialProvider?: SttProvider;
  initialModel?: string;
  initialCustomEndpoint?: string;
  onSaved?: () => void;
}

export default function CloudProviderPicker({
  initialProvider,
  initialModel,
  initialCustomEndpoint,
  onSaved,
}: CloudProviderPickerProps) {
  const [providerId, setProviderId] = useState<RemoteSttProvider["id"]>(() => {
    if (initialProvider && initialProvider !== "local") {
      return initialProvider;
    }
    return "groq";
  });
  const provider = remoteProviderConfig.find((p) => p.id === providerId)!;

  const [apiKey, setApiKey] = useState("");
  const [visible, setVisible] = useState(false);
  const [keyAlreadySet, setKeyAlreadySet] = useState(false);
  const [model, setModel] = useState(initialModel ?? provider.defaultModel);
  const [customEndpoint, setCustomEndpoint] = useState(initialCustomEndpoint ?? "");
  const [status, setStatus] = useState<TestStatus>({ kind: "idle" });
  const [busy, setBusy] = useState(false);

  const refreshKeyStatus = useCallback(async (pid: string) => {
    try {
      const set = await hasSttApiKey(pid);
      setKeyAlreadySet(set);
    } catch {
      setKeyAlreadySet(false);
    }
  }, []);

  useEffect(() => {
    refreshKeyStatus(providerId).catch(console.error);
  }, [providerId, refreshKeyStatus]);

  function handleProviderChange(next: RemoteSttProvider["id"]) {
    setProviderId(next);
    const p = remoteProviderConfig.find((x) => x.id === next)!;
    setModel(p.defaultModel);
    setApiKey("");
    setStatus({ kind: "idle" });
  }

  async function handleTest() {
    setBusy(true);
    setStatus({ kind: "testing" });
    try {
      await testSttProvider(
        providerId,
        apiKey.trim() || undefined,
        provider.needsCustomEndpoint ? customEndpoint.trim() : undefined,
      );
      setStatus({ kind: "ok" });
    } catch (e) {
      setStatus({ kind: "error", message: String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!model.trim()) {
      setStatus({ kind: "error", message: "Select a model first" });
      return;
    }
    if (provider.needsCustomEndpoint && !customEndpoint.trim()) {
      setStatus({ kind: "error", message: "Custom endpoint is required" });
      return;
    }
    setBusy(true);
    try {
      if (apiKey.trim()) {
        await saveSttApiKey(providerId, apiKey.trim());
      } else if (!keyAlreadySet) {
        setStatus({ kind: "error", message: "Enter an API key" });
        setBusy(false);
        return;
      }
      // Write dependent config first, then flip sttProvider last so readers
      // never observe a half-saved state.
      await setConfig("sttRemoteModel", model.trim());
      await setConfig(
        "sttCustomEndpoint",
        provider.needsCustomEndpoint ? customEndpoint.trim() : "",
      );
      await setConfig("sttProvider", providerId);
      setApiKey("");
      await refreshKeyStatus(providerId);
      setStatus({ kind: "ok" });
      onSaved?.();
    } catch (e) {
      setStatus({ kind: "error", message: String(e) });
    } finally {
      setBusy(false);
    }
  }

  const saveDisabled =
    busy ||
    !model.trim() ||
    (!apiKey.trim() && !keyAlreadySet) ||
    (provider.needsCustomEndpoint && !customEndpoint.trim());

  const providerOptions = useMemo(
    () => remoteProviderConfig.map((p) => ({ value: p.id, label: p.name })),
    [],
  );
  const modelOptions = useMemo(
    () => provider.models.map((m) => ({ value: m, label: m })),
    [provider.models],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-primary">Provider</label>
          <Select
            options={providerOptions}
            value={providerId}
            onChange={(v) => handleProviderChange(v as RemoteSttProvider["id"])}
            fullWidth
          />
        </div>

        {provider.needsCustomEndpoint && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">
              Endpoint URL
            </label>
            <input
              type="text"
              value={customEndpoint}
              onChange={(e) => setCustomEndpoint(e.target.value)}
              placeholder="https://my-host.tld/v1"
              className="w-full h-9 px-3 rounded-lg border border-border bg-bg-secondary text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <p className="text-xs text-text-tertiary">
              OpenAI-compatible /audio/transcriptions endpoint.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-primary">API Key</label>
            <span
              className={cn(
                "text-xs",
                keyAlreadySet ? "text-success" : "text-text-tertiary",
              )}
            >
              {keyAlreadySet ? "Connected" : "Not configured"}
            </span>
          </div>
          <div className="relative">
            <input
              type={visible ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={keyAlreadySet ? "Enter new key to replace" : provider.placeholder}
              disabled={busy}
              className="w-full h-9 px-3 pr-9 rounded-lg border border-border bg-bg-secondary text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary cursor-pointer"
            >
              {visible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-primary">Model</label>
          {provider.models.length > 0 ? (
            <Select
              options={modelOptions}
              value={model}
              onChange={setModel}
              fullWidth
            />
          ) : (
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="whisper-1"
              className="w-full h-9 px-3 rounded-lg border border-border bg-bg-secondary text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleTest}
            disabled={busy || (!apiKey.trim() && !keyAlreadySet)}
            className="px-3 h-8 rounded-md border border-border text-xs font-medium text-text-secondary hover:bg-bg-secondary disabled:opacity-40 cursor-pointer"
          >
            {status.kind === "testing" ? "Testing..." : "Test connection"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveDisabled}
            className="px-3 h-8 rounded-md bg-accent text-white text-xs font-medium hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Save
          </button>
          {status.kind === "ok" && (
            <span className="text-xs text-success">Ready</span>
          )}
          {status.kind === "error" && (
            <span className="text-xs text-error truncate">{status.message}</span>
          )}
        </div>
      </div>
    </div>
  );
}
