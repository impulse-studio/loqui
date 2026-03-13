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
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
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
