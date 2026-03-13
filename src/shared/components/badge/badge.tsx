import { type ReactNode } from "react";
import cn from "../../lib/utils/cn";
import badgeVariantStyles from "./badge-variant-styles";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "accent" | "success" | "error";
}

export default function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        badgeVariantStyles[variant]
      )}
    >
      {children}
    </span>
  );
}
