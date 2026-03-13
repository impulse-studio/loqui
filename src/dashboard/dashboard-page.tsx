import { useState } from "react";
import PeriodSelector from "../shared/components/period-selector";
import statPeriods from "./activity/stat-periods";
import periodToDays from "./activity/period-to-days";
import StatsRow from "./stats/stats-row";
import ActivityChart from "./activity/activity-chart";
import RecentTranscripts from "./recent/recent-transcripts";

export default function DashboardPage() {
  const [activePeriod, setActivePeriod] = useState("Week");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <StatsRow />

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Activity</h2>
          <PeriodSelector
            periods={statPeriods}
            active={activePeriod}
            onChange={setActivePeriod}
          />
        </div>
        <ActivityChart days={periodToDays[activePeriod] ?? 7} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Transcripts</h2>
        <RecentTranscripts />
      </div>
    </div>
  );
}
