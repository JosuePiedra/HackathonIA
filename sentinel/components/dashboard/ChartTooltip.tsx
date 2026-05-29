interface TooltipEntry {
  name?: string | number;
  value?: string | number;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}

export function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: "8px 10px",
        fontSize: 12,
        fontFamily: "var(--font-dm-mono)",
      }}
    >
      {label !== undefined && label !== "" ? (
        <div style={{ color: "var(--text-tertiary)", marginBottom: 4 }}>{label}</div>
      ) : null}
      {payload.map((p, i) => (
        <div
          key={i}
          style={{ color: "var(--text-primary)", display: "flex", gap: 6, alignItems: "center" }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: (p.color as string) ?? "var(--accent)",
            }}
          />
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString("es-EC") : p.value}
        </div>
      ))}
    </div>
  );
}

/** Paleta de gráficos en hex (Recharts no resuelve var() en atributos SVG de forma fiable). */
export const CHART_COLORS = {
  red: "#EF4444",
  yellow: "#EAB308",
  green: "#22C55E",
  accent: "#4F8EF7",
  purple: "#8B5CF6",
  axis: "#8B92A5",
  grid: "#1E2028",
} as const;
