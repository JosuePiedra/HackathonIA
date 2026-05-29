"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import { ChartTooltip, CHART_COLORS } from "./ChartTooltip";
import type { HistogramBucket } from "@/lib/types";

/** Color por zona de riesgo del score: 0-40 verde, 41-75 amarillo, 76-100 rojo. */
function colorForBucket(index: number): string {
  if (index <= 3) return CHART_COLORS.green;
  if (index <= 7) return CHART_COLORS.yellow;
  return CHART_COLORS.red;
}

export function ScoreHistogram({ data }: { data: HistogramBucket[] }) {
  return (
    <div style={{ width: "100%", height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <XAxis
            dataKey="range"
            tick={{ fill: CHART_COLORS.axis, fontSize: 10, fontFamily: "var(--font-dm-mono)" }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="count" name="Casos" radius={[4, 4, 0, 0]}>
            {data.map((b, i) => (
              <Cell key={b.range} fill={colorForBucket(i)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
