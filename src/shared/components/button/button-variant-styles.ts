const buttonVariantStyles: Record<string, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover active:bg-accent-hover/90",
  secondary:
    "bg-bg-secondary text-text-primary border border-border hover:bg-bg-tertiary",
  destructive: "bg-error text-white hover:bg-error/90 active:bg-error/80",
  ghost: "text-text-secondary hover:bg-bg-secondary active:bg-bg-tertiary",
  // Inline text action (e.g. "Change", "Update available"). No box — pairs
  // with `size="inline"` so it sits in flowing text without button chrome.
  link: "text-accent hover:text-accent-hover hover:underline underline-offset-2 rounded-sm",
};

export default buttonVariantStyles;
