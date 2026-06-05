import { useState } from "react";
import PageHeader from "../shared/components/page-header";
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
      <PageHeader
        title="Dashboard"
        description="Your dictation activity at a glance."
      />

      <StatsRow />

      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Activity</h2>
          <PeriodSelector
            periods={statPeriods}
            active={activePeriod}
            onChange={setActivePeriod}
          />
        </div>
        <ActivityChart days={periodToDays[activePeriod] ?? 7} />
      </div>

      <div>
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] mb-4">
          Recent Transcripts
        </h2>
        <RecentTranscripts />
      </div>
    </div>
  );
}
