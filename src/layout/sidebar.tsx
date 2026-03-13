import { NavLink } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import cn from "../shared/lib/utils/cn";
import sidebarNavItems from "./sidebar-nav-items";

export default function Sidebar() {
  return (
    <aside className="w-[172px] min-w-[172px] h-full bg-bg-secondary border-r border-border flex flex-col">
      <div
        data-tauri-drag-region
        className="flex items-center gap-2.5 px-4 h-11 shrink-0 border-b border-border"
      >
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => getCurrentWindow().close()}
            className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-90 transition-all"
          />
          <button
            onClick={() => getCurrentWindow().minimize()}
            className="w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-90 transition-all"
          />
        </div>
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
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-colors duration-150",
                isActive
                  ? "bg-accent-subtle text-accent font-medium"
                  : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
