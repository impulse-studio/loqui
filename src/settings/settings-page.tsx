import PageHeader from "../shared/components/page-header";
import GeneralSection from "./general/general-section";
import SpeechSection from "./speech/speech-section";
import LlmSection from "./llm/llm-section";
import WidgetSection from "./widget/widget-section";
import DataSection from "./data/data-section";
import AboutSection from "./about/about-section";
import DebugSection from "./debug-section";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Settings"
        description="Configure dictation, models, and the widget."
      />
      <GeneralSection />
      <SpeechSection />
      <LlmSection />
      <WidgetSection />
      <DataSection />
      <AboutSection />
      <DebugSection />
    </div>
  );
}
