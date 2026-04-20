import { useEffect } from "react";
import Card from "../../shared/components/card";
import CloudProviderPicker from "../../shared/components/cloud-provider-picker";
import type { FooterConfig } from "../step-registry";

interface StepWelcomeCloudProps {
  goNext: () => void;
  setFooter: (config: FooterConfig | null) => void;
  onSwitchToLocal: () => void;
}

export default function StepWelcomeCloud({
  goNext,
  setFooter,
  onSwitchToLocal,
}: StepWelcomeCloudProps) {
  useEffect(() => {
    setFooter({
      label: "Save the configuration to continue",
      onClick: () => {},
      disabled: true,
    });
  }, [setFooter]);

  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        Set up cloud transcription
      </h2>
      <p className="text-sm text-text-secondary mb-6">
        Your audio will be sent to the provider you choose. You can switch back
        to a fully local model at any time.
      </p>

      <div className="text-left max-w-md mx-auto">
        <Card className="px-5 py-4">
          <CloudProviderPicker onSaved={goNext} />
        </Card>
      </div>

      <button
        type="button"
        onClick={onSwitchToLocal}
        className="mt-6 text-xs text-text-tertiary hover:text-text-secondary underline cursor-pointer"
      >
        I prefer keeping everything private — use a local model
      </button>
    </div>
  );
}
