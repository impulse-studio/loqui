import { useEffect } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export function useTauriEvent<T>(
  eventName: string,
  handler: (payload: T) => void
) {
  useEffect(() => {
    let cancelled = false;
    let unlisten: UnlistenFn | undefined;

    listen<T>(eventName, (event) => {
      if (!cancelled) {
        handler(event.payload);
      }
    }).then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlisten = fn;
      }
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [eventName, handler]);
}
