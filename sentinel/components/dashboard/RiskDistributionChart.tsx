"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltip, CHART_COLORS } from "./ChartTooltip";

interface Props {
  rojo: number;
  amarillo: number;
  verde: number;
}

export function RiskDistributionChart({ rojo, amarillo, verde }: Props) {
  const data = [
    { name: "Rojos", value: rojo, color: CHART_COLORS.red },
    { name: "Amarillos", value: amarillo, color: CHART_COLORS.yellow },
    { name: "Verdes", value: verde, color: CHART_COLORS.green },
  ];
  const total = rojo + amarillo + verde;

  return (
    <div style={{ width: "100%", height: 200, position: "relative" }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div style={{ fontFamily: "var(--font-syne)", fontSize: 28, fontWeight: 600 }}>
          {total}
        </div>
        <div
          style={{
            fontFamily: "var(--font-dm-mono)",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--text-tertiary)",
          }}
        >
          Casos
        </div>
      </div>
    </div>
  );
}
