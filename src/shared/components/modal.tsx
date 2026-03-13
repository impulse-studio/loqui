import { type ReactNode, useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;

    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="
          relative bg-bg-primary rounded-2xl border border-border
          shadow-[0_4px_24px_rgba(0,0,0,0.08)]
          min-w-[400px] max-w-[560px] max-h-[80vh]
          overflow-y-auto p-6
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
