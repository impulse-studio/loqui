import { useState } from "react";
import type { StepComponentProps } from "../step-registry";
import StepWelcomeLocal from "./step-welcome-local";
import StepWelcomeCloud from "./step-welcome-cloud";

type Mode = "local" | "cloud";

export default function StepWelcome({ goNext, setFooter }: StepComponentProps) {
  const [mode, setMode] = useState<Mode>("local");

  return mode === "local" ? (
    <StepWelcomeLocal
      goNext={goNext}
      setFooter={setFooter}
      onSwitchToCloud={() => setMode("cloud")}
    />
  ) : (
    <StepWelcomeCloud
      goNext={goNext}
      setFooter={setFooter}
      onSwitchToLocal={() => setMode("local")}
    />
  );
}
