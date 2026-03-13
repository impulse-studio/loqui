import { useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Card from "../shared/components/card";
import { setConfig } from "../shared/lib/tauri-commands";

export default function DebugSection() {
  const handleResetOnboarding = useCallback(async () => {
    await setConfig("onboardingComplete", "false");
    await getCurrentWindow().close();
  }, []);

  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold mb-3">Debugging</h2>
      <Card className="divide-y divide-border">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <div className="text-sm font-medium">Reset Onboarding</div>
            <div className="text-xs text-text-secondary">
              Resets onboarding and closes the app
            </div>
          </div>
          <button
            onClick={handleResetOnboarding}
            className="text-xs text-error font-medium border border-error/40 rounded-lg px-3 py-1.5 hover:bg-error/10 transition-colors"
          >
            Reset
          </button>
        </div>
      </Card>
    </section>
  );
}
