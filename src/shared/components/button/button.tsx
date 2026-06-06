import { type ButtonHTMLAttributes } from "react";
import cn from "../../lib/utils/cn";
import buttonVariantStyles from "./button-variant-styles";
import buttonSizeStyles from "./button-size-styles";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "ghost" | "link";
  size?: "inline" | "sm" | "md" | "lg";
}

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isLink = variant === "link";
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium cursor-pointer",
        // Tailwind's `transition` animates a curated property set (colors,
        // transform, box-shadow) — intentional, not `transition: all`.
        "transition duration-150 ease-out motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        // Tactile press feedback for real buttons; links stay flat.
        !isLink && "active:scale-[0.98]",
        buttonVariantStyles[variant],
        buttonSizeStyles[isLink ? "inline" : size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
