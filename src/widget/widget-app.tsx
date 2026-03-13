import { StrictMode, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AnimatePresence, motion } from "motion/react";
import { getConfig, loadSttModel } from "../shared/lib/tauri-commands";
import { useTauriEvent } from "../shared/hooks/use-tauri-event";
import cn from "../shared/lib/utils/cn";
import {
  EVENTS,
  type AgentStatePayload,
  type AudioLevelPayload,
  type ModelLoadedPayload,
} from "../shared/lib/tauri-events";
import { DEFAULT_CONFIG } from "../shared/types/config";
import "../index.css";
import "./widget-animations.css";
import IdleBar from "./idle-bar";
import GlowPill from "./glow-pill";
import FftBars from "./fft-bars";
import WaveBars from "./wave-bars";
import useFftBars from "./hooks/use-fft-bars";

type WidgetState =
  | "model-loading"
  | "idle"
  | "recording"
  | "processing"
  | "success"
  | "error";

function Widget() {
  const [state, setState] = useState<WidgetState>("model-loading");
  const [audioLevel, setAudioLevel] = useState(0);
  const stateRef = useRef<WidgetState>("model-loading");
  stateRef.current = state;

  const bars = useFftBars(state === "recording" ? audioLevel : 0);

  const isActive =
    state === "recording" ||
    state === "processing" ||
    state === "success" ||
    state === "error";

  const startDrag = useCallback((e: React.MouseEvent) => {
    if (stateRef.current === "recording") return;
    e.preventDefault();
    getCurrentWindow().startDragging();
  }, []);

  // Safety net: request model-loaded re-emit
  useEffect(() => {
    getConfig()
      .then((config) => {
        const modelId = config.sttModel || DEFAULT_CONFIG.sttModel!;
        return loadSttModel(modelId);
      })
      .catch(console.error);
  }, []);

  // Listen for model-loaded -> idle
  const handleModelLoaded = useCallback((_payload: ModelLoadedPayload) => {
    setState("idle");
  }, []);
  useTauriEvent(EVENTS.MODEL_LOADED, handleModelLoaded);

  // Listen for agent-state-changed -> update state
  const handleStateChanged = useCallback((payload: AgentStatePayload) => {
    const s = payload.state as WidgetState;
    setState(s);
    if (s !== "recording") {
      setAudioLevel(0);
    }
  }, []);
  useTauriEvent(EVENTS.AGENT_STATE_CHANGED, handleStateChanged);

  // Listen for audio-level -> update level
  const handleAudioLevel = useCallback(
    (payload: AudioLevelPayload) => {
      if (stateRef.current === "recording") {
        setAudioLevel(payload.level);
      }
    },
    [],
  );
  useTauriEvent(EVENTS.AUDIO_LEVEL, handleAudioLevel);

  // Auto-transition success/error back to idle
  useEffect(() => {
    if (state === "success" || state === "error") {
      const delay = state === "success" ? 1500 : 2000;
      const timer = setTimeout(() => setState("idle"), delay);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const pillColor = state === "recording"
    ? "recording"
    : state === "processing"
      ? "processing"
      : state === "success"
        ? "success"
        : "error";

  return (
    <div
      className={cn(
        "flex items-center justify-center w-full h-full select-none",
        state !== "recording" && "cursor-grab active:cursor-grabbing"
      )}
      onMouseDown={startDrag}
    >
      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <IdleBar />
          </motion.div>
        )}

        {state === "model-loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="w-[48px] h-[4px] rounded-full bg-accent/40"
              style={{ animation: "pulse-glow 2s ease-in-out infinite" }}
            />
          </motion.div>
        )}

        {isActive && (
          <motion.div
            key="active"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 28,
            }}
          >
            <GlowPill color={pillColor}>
              <AnimatePresence mode="wait">
                {state === "recording" ? (
                  <motion.div
                    key="fft"
                    className="w-full h-full flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FftBars bars={bars} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="wave"
                    className="w-full h-full flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <WaveBars />
                  </motion.div>
                )}
              </AnimatePresence>
            </GlowPill>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Widget />
  </StrictMode>,
);
