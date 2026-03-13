import { useEffect, useState } from "react";
import { X } from "lucide-react";
import cn from "../../lib/utils/cn";
import toastIcons from "./toast-icons";
import toastVariantStyles from "./toast-variant-styles";

type ToastVariant = "success" | "error" | "info";

interface ToastData {
  id: string;
  message: string;
  variant: ToastVariant;
}

let addToastFn: ((message: string, variant?: ToastVariant) => void) | null =
  null;

export function toast(message: string, variant: ToastVariant = "success") {
  addToastFn?.(message, variant);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    addToastFn = (message, variant = "success") => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    };
    return () => {
      addToastFn = null;
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-100 flex flex-col gap-2">
      {toasts.map((t) => {
        const Icon = toastIcons[t.variant];
        return (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-xl border shadow-[0_4px_24px_rgba(0,0,0,0.08)] animate-[slideIn_0.2s_ease-out]",
              toastVariantStyles[t.variant]
            )}
          >
            <Icon size={16} />
            <span className="text-sm text-text-primary">{t.message}</span>
            <button
              onClick={() =>
                setToasts((prev) => prev.filter((x) => x.id !== t.id))
              }
              className="ml-2 text-text-tertiary hover:text-text-primary"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
