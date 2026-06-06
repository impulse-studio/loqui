import { NavLink } from "react-router-dom";
import { open } from "@tauri-apps/plugin-shell";
import cn from "../shared/lib/utils/cn";
import Button from "../shared/components/button/button";
import appVersion from "../shared/constants/app-version";
import useUpdateCheck from "../shared/hooks/use-update-check";
import sidebarNavItems from "./sidebar-nav-items";

export default function Sidebar() {
  const updateAvailable = useUpdateCheck();

  return (
    <aside className="w-[172px] min-w-[172px] h-full bg-bg-secondary border-r border-border flex flex-col">
      {/* Left padding reserves room for the native macOS traffic lights,
          which the Overlay titlebar floats over this corner. */}
      <div
        data-tauri-drag-region
        className="flex items-center pl-[78px] pr-4 h-11 shrink-0 border-b border-border"
      >
        <span
          data-tauri-drag-region
          className="text-[13px] font-medium text-text-secondary"
        >
          Loqui
        </span>
      </div>

      <nav className="flex-1 px-3 pt-3 space-y-0.5">
        {sidebarNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                // font-medium is constant across states — only color/bg change,
                // so the active item never shifts the layout.
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium",
                "transition-colors duration-150 ease-out motion-reduce:transition-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                isActive
                  ? "bg-accent-subtle text-accent"
                  : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-border">
        <div className="text-[11px] text-text-tertiary tabular-nums">v{appVersion}</div>
        {updateAvailable && (
          <Button
            variant="link"
            onClick={() => open("https://loqui.impulselab.ai")}
            className="text-[11px]"
          >
            Update available
          </Button>
        )}
      </div>
    </aside>
  );
}
