import { useCallback, useEffect, useRef, useState } from "react";
import type { StepComponentProps } from "../step-registry";
import PermissionRow from "./permission-row";
import PermissionIcon from "./permission-icon";
import permissionsConfig, {
  type PermissionDef,
  type PermissionId,
} from "./permissions-config";

type StatusMap = Record<PermissionId, boolean>;

export default function StepPermissions({ goNext, setFooter }: StepComponentProps) {
  const [status, setStatus] = useState<StatusMap>({
    microphone: false,
    accessibility: false,
    inputMonitoring: false,
  });
  const [busy, setBusy] = useState<StatusMap>({
    microphone: false,
    accessibility: false,
    inputMonitoring: false,
  });
  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;

  const refresh = useCallback(async () => {
    const entries = await Promise.all(
      permissionsConfig.map(async (p) => [p.id, await p.check()] as const),
    );
    setStatus(Object.fromEntries(entries) as StatusMap);
  }, []);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  const allGranted = Object.values(status).every(Boolean);

  useEffect(() => {
    setFooter({
      label: "Continue",
      onClick: goNextRef.current,
      disabled: !allGranted,
    });
  }, [allGranted, setFooter]);

  const handleGrant = useCallback(
    async (perm: PermissionDef) => {
      setBusy((b) => ({ ...b, [perm.id]: true }));
      try {
        const granted = await perm.request();
        setStatus((s) => ({ ...s, [perm.id]: granted }));
        // Accessibility + Input Monitoring open System Settings async —
        // user may grant there, so re-check after a beat.
        if (!granted) {
          setTimeout(() => {
            refresh().catch(console.error);
          }, 1500);
        }
      } catch (e) {
        console.error(`Failed to request ${perm.id}:`, e);
      } finally {
        setBusy((b) => ({ ...b, [perm.id]: false }));
      }
    },
    [refresh],
  );

  return (
    <div className="text-center max-w-md mx-auto">
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        A few permissions first
      </h2>
      <p className="text-sm text-text-secondary mb-6">
        Loqui needs a couple of system permissions to work. Grant them here so
        you don&apos;t hit a cold system prompt later.
      </p>

      <div className="space-y-3 text-left">
        {permissionsConfig.map((perm) => (
          <PermissionRow
            key={perm.id}
            icon={<PermissionIcon id={perm.id} />}
            title={perm.title}
            body={perm.body}
            granted={status[perm.id]}
            busy={busy[perm.id]}
            onGrant={() => handleGrant(perm)}
          />
        ))}
      </div>
    </div>
  );
}
