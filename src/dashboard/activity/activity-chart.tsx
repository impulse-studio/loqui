import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Card from "../../shared/components/card";
import { getActivity } from "../../shared/lib/tauri-commands";
import type { ActivityPoint } from "../../shared/types/transcript";
import fillDateGaps from "./fill-date-gaps";
import formatChartLabel from "./format-chart-label";

interface ActivityChartProps {
  days: number;
}

export default function ActivityChart({ days }: ActivityChartProps) {
  const [data, setData] = useState<ActivityPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getActivity(days)
      .then((raw) => setData(fillDateGaps(raw, days)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  const hasData = data.some((d) => d.words > 0);

  if (loading || !hasData) {
    return (
      <Card className="h-48 flex items-center justify-center">
        <span className="text-text-tertiary text-sm">
          {loading
            ? "Loading..."
            : "Activity chart — available after first transcriptions"}
        </span>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: formatChartLabel(d.date, days),
  }));

  return (
    <Card className="h-48 px-2 py-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--color-border)",
            }}
            formatter={(value: number) => [value.toLocaleString(), "words"]}
            labelFormatter={(label: string) => label}
          />
          <Bar
            dataKey="words"
            fill="#2563eb"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
