import { useEffect, useRef, useState } from "react";
import keyEventToShortcut from "./key-event-to-shortcut";

export default function useHotkeyRecorder(recording: boolean) {
  const [liveKeys, setLiveKeys] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const pressedCodesRef = useRef(new Set<string>());
  const lastComboRef = useRef<string[]>([]);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!recording) return;

    pressedCodesRef.current.clear();
    lastComboRef.current = [];
    setResult(null);

    function onKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();

      if (releaseTimerRef.current) {
        clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }

      const key = keyEventToShortcut(e.code);
      if (!key) return;

      pressedCodesRef.current.add(e.code);

      const uniqueKeys = [
        ...new Set(
          [...pressedCodesRef.current]
            .map((c) => keyEventToShortcut(c))
            .filter(Boolean) as string[],
        ),
      ];
      lastComboRef.current = uniqueKeys;
      setLiveKeys(uniqueKeys);
    }

    function onKeyUp(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();

      pressedCodesRef.current.delete(e.code);

      if (
        pressedCodesRef.current.size === 0 &&
        lastComboRef.current.length > 0
      ) {
        releaseTimerRef.current = setTimeout(() => {
          setResult(lastComboRef.current.join("+"));
          setLiveKeys([]);
        }, 80);
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    };
  }, [recording]);

  function reset() {
    setLiveKeys([]);
    setResult(null);
    pressedCodesRef.current.clear();
    lastComboRef.current = [];
  }

  return { liveKeys, result, reset };
}
