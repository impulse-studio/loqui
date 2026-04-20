import cn from "../../shared/lib/utils/cn";

interface PermissionRowProps {
  icon: React.ReactNode;
  title: string;
  body: string;
  granted: boolean;
  busy: boolean;
  onGrant: () => void;
}

export default function PermissionRow({
  icon,
  title,
  body,
  granted,
  busy,
  onGrant,
}: PermissionRowProps) {
  return (
    <div className="flex gap-3 px-4 py-3 rounded-lg border border-border bg-bg-card">
      <div className="w-8 h-8 rounded-lg bg-accent-subtle text-accent flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-text-primary">{title}</div>
        <div className="text-xs text-text-secondary mt-0.5">{body}</div>
      </div>
      <button
        type="button"
        onClick={onGrant}
        disabled={granted || busy}
        className={cn(
          "px-3 h-8 rounded-md text-xs font-medium self-center shrink-0 transition-colors cursor-pointer",
          granted
            ? "bg-success/15 text-success cursor-default"
            : "bg-accent text-white hover:bg-accent/90",
          busy && !granted && "opacity-60 cursor-wait",
        )}
      >
        {granted ? "Granted" : busy ? "Requesting..." : "Grant"}
      </button>
    </div>
  );
}
