import { useCallback, useState } from "react";
import cn from "../shared/lib/utils/cn";
import stepRegistry, { type FooterConfig } from "./step-registry";

interface OnboardingLayoutProps {
  onComplete: () => void;
}

export default function OnboardingLayout({ onComplete }: OnboardingLayoutProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [footer, setFooterState] = useState<FooterConfig | null>(null);

  const isLastStep = currentStep === stepRegistry.length - 1;
  const entry = stepRegistry[currentStep];
  const StepComponent = entry.component;

  const goNext = useCallback(() => {
    if (!isLastStep) {
      setFooterState(null);
      setCurrentStep((s) => s + 1);
    }
  }, [isLastStep]);

  const setFooter = useCallback((config: FooterConfig | null) => {
    setFooterState(config);
  }, []);

  function handleBack() {
    if (currentStep > 0) {
      setFooterState(null);
      setCurrentStep((s) => s - 1);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Header + stepper */}
      <div className="shrink-0 pt-8 pb-2">
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span className="text-lg font-semibold text-text-primary">Loqui</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          {stepRegistry.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium",
                  i <= currentStep
                    ? "bg-accent text-white"
                    : "bg-bg-tertiary text-text-tertiary"
                )}
              >
                {i < currentStep ? "\u2713" : i + 1}
              </div>
              <span
                className={cn(
                  "text-sm",
                  i === currentStep ? "text-text-primary font-medium" : "text-text-tertiary"
                )}
              >
                {step.label}
              </span>
              {i < stepRegistry.length - 1 && (
                <div className="w-8 h-px bg-border" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content — vertically centered in remaining space */}
      <div className="flex-1 flex items-center justify-center overflow-y-auto px-8">
        <div className="w-full max-w-xl">
          <StepComponent
            onComplete={onComplete}
            goNext={goNext}
            setFooter={setFooter}
          />
        </div>
      </div>

      {/* Footer — controlled by the active step */}
      {footer && (
        <div className="flex items-center justify-between px-8 py-4 border-t border-border">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>
          <div className="flex items-center gap-3">
            {footer.onCancel && (
              <button
                onClick={footer.onCancel}
                className="px-3 py-2 text-sm text-text-secondary hover:text-error transition-colors"
              >
                Cancel download
              </button>
            )}
            <button
            onClick={footer.onClick}
            disabled={footer.disabled || footer.loading}
            className="relative overflow-hidden px-6 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[120px]"
          >
            {footer.loading && footer.progress != null && (
              <div
                className="absolute inset-0 bg-white/15 transition-all duration-300"
                style={{ width: `${footer.progress}%` }}
              />
            )}
            <span className="relative flex items-center justify-center gap-2">
              {footer.loading && (
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {footer.label}
            </span>
          </button>
          </div>
        </div>
      )}
    </div>
  );
}
