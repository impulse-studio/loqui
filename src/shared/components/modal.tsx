import { type ReactNode, useEffect, useRef } from "react";
import FOCUSABLE from "./modal-focusable-selector";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Keep the latest onClose without making it an effect dependency — otherwise
  // a non-memoized onClose would re-run the effect on every render and bounce
  // focus back to the trigger while the dialog is still open.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    // Restore focus to whatever was focused before the dialog opened.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Lock background scroll while the dialog is up.
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    // Move focus into the dialog: try the first focusable control, then fall
    // back to the panel itself (tabIndex=-1) if that target wasn't focusable
    // (e.g. hidden), so the trap always holds.
    const panel = panelRef.current;
    const focusables = panel?.querySelectorAll<HTMLElement>(FOCUSABLE);
    focusables?.[0]?.focus();
    if (panel && !panel.contains(document.activeElement)) {
      panel.focus();
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      // Trap Tab within the dialog.
      if (e.key !== "Tab" || !panel) return;
      const items = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-fade-in motion-reduce:animate-none"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="
          relative bg-bg-primary rounded-2xl border border-border
          shadow-[var(--shadow-overlay)]
          min-w-[400px] max-w-[560px] max-h-[80vh]
          overflow-y-auto p-6 focus:outline-none
          animate-modal-in motion-reduce:animate-none
        "
      >
        {title && (
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
