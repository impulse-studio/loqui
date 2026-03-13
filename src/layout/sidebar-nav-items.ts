import { LayoutDashboard, FileText, UserCircle, Settings } from "lucide-react";

const sidebarNavItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/transcripts", icon: FileText, label: "Transcripts" },
  { to: "/profiles", icon: UserCircle, label: "Profiles" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default sidebarNavItems;
