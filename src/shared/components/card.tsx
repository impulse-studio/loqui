import { type HTMLAttributes, type ReactNode } from "react";
import cn from "../lib/utils/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  featured?: boolean;
}

export default function Card({
  children,
  featured = false,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-bg-card rounded-xl border shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        featured ? "border-accent" : "border-border",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
