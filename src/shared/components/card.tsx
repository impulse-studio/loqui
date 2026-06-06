import { type HTMLAttributes, type ReactNode } from "react";
import cn from "../lib/utils/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  featured?: boolean;
  /** Adds a subtle hover lift for clickable cards. */
  interactive?: boolean;
}

export default function Card({
  children,
  featured = false,
  interactive = false,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-bg-card rounded-xl border shadow-[var(--shadow-card)]",
        featured ? "border-accent" : "border-border",
        interactive &&
          "transition-shadow duration-200 ease-out motion-reduce:transition-none hover:shadow-[var(--shadow-popover)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
