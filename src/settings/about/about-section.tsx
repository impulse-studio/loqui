import { open } from "@tauri-apps/plugin-shell";
import { ExternalLink } from "lucide-react";
import Card from "../../shared/components/card";
import appVersion from "../../shared/constants/app-version";

export default function AboutSection() {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold mb-3">About</h2>
      <Card className="divide-y divide-border">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm">Version</span>
          <span className="text-sm text-text-secondary">{appVersion}</span>
        </div>

        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm">Source code</span>
          <button
            onClick={() => open("https://github.com/impulse-studio/loqui")}
            className="inline-flex items-center gap-1.5 text-xs text-accent font-medium hover:underline"
          >
            GitHub
            <ExternalLink size={12} />
          </button>
        </div>

        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm">Report an issue</span>
          <button
            onClick={() => open("https://github.com/impulse-studio/loqui/issues")}
            className="inline-flex items-center gap-1.5 text-xs text-accent font-medium hover:underline"
          >
            Feedback
            <ExternalLink size={12} />
          </button>
        </div>
      </Card>
    </section>
  );
}
