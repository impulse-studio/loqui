import {
  checkAccessibilityPermission,
  checkInputMonitoringPermission,
  checkMicrophonePermission,
  requestAccessibilityPermission,
  requestInputMonitoringPermission,
  requestMicrophonePermission,
} from "../../shared/lib/tauri-commands";

export type PermissionId = "microphone" | "accessibility" | "inputMonitoring";

export interface PermissionDef {
  id: PermissionId;
  title: string;
  body: string;
  check: () => Promise<boolean>;
  request: () => Promise<boolean>;
}

const permissionsConfig: PermissionDef[] = [
  {
    id: "microphone",
    title: "Microphone",
    body: "Capture your voice for transcription. Audio stays on-device unless you choose a cloud provider.",
    check: checkMicrophonePermission,
    request: requestMicrophonePermission,
  },
  {
    id: "accessibility",
    title: "Accessibility",
    body: "Required to paste the transcribed text into the focused app.",
    check: checkAccessibilityPermission,
    request: requestAccessibilityPermission,
  },
  {
    id: "inputMonitoring",
    title: "Input monitoring",
    body: "Listen for your dictation hotkey globally. No keystrokes are recorded.",
    check: checkInputMonitoringPermission,
    request: requestInputMonitoringPermission,
  },
];

export default permissionsConfig;
