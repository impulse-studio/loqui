import { KeyRound, Keyboard, Mic } from "lucide-react";
import type { PermissionId } from "./permissions-config";

interface PermissionIconProps {
  id: PermissionId;
}

export default function PermissionIcon({ id }: PermissionIconProps) {
  switch (id) {
    case "microphone":
      return <Mic size={18} />;
    case "accessibility":
      return <KeyRound size={18} />;
    case "inputMonitoring":
      return <Keyboard size={18} />;
  }
}
