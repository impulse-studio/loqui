import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import MainLayout from "./layout/main-layout";
import DashboardPage from "./dashboard/dashboard-page";
import TranscriptsPage from "./transcripts/transcripts-page";
import ProfilesPage from "./profiles/profiles-page";
import SettingsPage from "./settings/settings-page";
import OnboardingLayout from "./onboarding/onboarding-layout";
import ToastContainer from "./shared/components/toast-container";
import { useAgentStore } from "./shared/stores/agent-store";
import { getConfig, setConfig } from "./shared/lib/tauri-commands";

export default function App() {
  const storeSetConfig = useAgentStore((s) => s.setConfig);
  const updateConfig = useAgentStore((s) => s.updateConfig);
  const config = useAgentStore((s) => s.config);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConfig()
      .then((c) => {
        storeSetConfig(c);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, [storeSetConfig]);

  function handleOnboardingComplete() {
    setConfig("onboardingComplete", "true").catch(console.error);
    updateConfig("onboardingComplete", "true");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-primary">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const onboardingComplete = config.onboardingComplete === "true";

  if (!onboardingComplete) {
    return (
      <>
        <OnboardingLayout onComplete={handleOnboardingComplete} />
        <ToastContainer />
      </>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/transcripts" element={<TranscriptsPage />} />
          <Route path="/profiles" element={<ProfilesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}
