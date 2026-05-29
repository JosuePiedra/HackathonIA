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
import type { ProveedorStats } from "@/lib/types";

export function TopProvidersChart({ data }: { data: ProveedorStats[] }) {
  const chartData = data.map((p) => ({
    name: p.id_proveedor,
    casos: p.casos_totales,
    restrictivo: p.en_lista_restrictiva,
  }));

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
          <XAxis type="number" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: CHART_COLORS.axis, fontSize: 11, fontFamily: "var(--font-dm-mono)" }}
            width={72}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="casos" name="Casos" radius={[0, 4, 4, 0]}>
            {chartData.map((d) => (
              <Cell key={d.name} fill={d.restrictivo ? CHART_COLORS.red : CHART_COLORS.accent} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
