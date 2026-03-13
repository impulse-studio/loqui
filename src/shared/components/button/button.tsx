import { type ButtonHTMLAttributes } from "react";
import cn from "../../lib/utils/cn";
import buttonVariantStyles from "./button-variant-styles";
import buttonSizeStyles from "./button-size-styles";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "ghost";
  size?: "sm" | "md" | "lg";
}

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        buttonVariantStyles[variant],
        buttonSizeStyles[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
