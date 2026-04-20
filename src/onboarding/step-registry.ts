import type { ComponentType } from "react";
import StepPermissions from "./steps/step-permissions";
import StepWelcome from "./steps/step-welcome";
import StepMicrophone from "./steps/step-microphone";
import StepHotkey from "./steps/step-hotkey";
import StepTest from "./steps/step-test";
import StepComplete from "./steps/step-complete";

export interface FooterConfig {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  progress?: number;
  onCancel?: () => void;
}

export interface StepComponentProps {
  onComplete: () => void;
  goNext: () => void;
  setFooter: (config: FooterConfig | null) => void;
}

export interface StepEntry {
  label: string;
  component: ComponentType<StepComponentProps>;
}

const stepRegistry: StepEntry[] = [
  { label: "Permissions", component: StepPermissions },
  { label: "Model", component: StepWelcome },
  { label: "Microphone", component: StepMicrophone },
  { label: "Hotkey", component: StepHotkey },
  { label: "Test", component: StepTest },
  { label: "Done", component: StepComplete },
];

export default stepRegistry;
