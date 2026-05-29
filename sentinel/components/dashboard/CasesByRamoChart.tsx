"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { ChartTooltip, CHART_COLORS } from "./ChartTooltip";
import type { RamoStats } from "@/lib/types";

export function CasesByRamoChart({ data }: { data: RamoStats[] }) {
  const chartData = data.map((r) => ({
    name: r.ramo,
    Verde: r.verde,
    Amarillo: r.amarillo,
    Rojo: r.rojo,
  }));

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-dm-mono)" }} />
          <Bar dataKey="Verde" stackId="a" fill={CHART_COLORS.green} />
          <Bar dataKey="Amarillo" stackId="a" fill={CHART_COLORS.yellow} />
          <Bar dataKey="Rojo" stackId="a" fill={CHART_COLORS.red} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
