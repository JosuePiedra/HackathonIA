import type { MLPrediction } from "@/lib/types";

interface Props {
  prediccion_ml: MLPrediction;
  probabilidad_ml: number;
  version_modelo?: string;
}

export function MLInsight({ prediccion_ml, probabilidad_ml, version_modelo }: Props) {
  const sospechoso = prediccion_ml === 1;
  const color = sospechoso ? "var(--risk-red)" : "var(--risk-green)";
  const bg = sospechoso ? "var(--risk-red-bg)" : "var(--risk-green-bg)";
  const border = sospechoso ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.25)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <div>
        <div
          style={{
            fontFamily: "var(--font-syne)",
            fontSize: 40,
            fontWeight: 600,
            color,
            lineHeight: 1,
          }}
        >
          {Math.round(probabilidad_ml * 100)}%
        </div>
        <div
          style={{
            fontFamily: "var(--font-dm-mono)",
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginTop: 4,
          }}
        >
          Probabilidad estimada de fraude
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <span
          style={{
            display: "inline-block",
            fontFamily: "var(--font-dm-mono)",
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            padding: "4px 10px",
            borderRadius: 999,
            color,
            background: bg,
            border: `1px solid ${border}`,
          }}
        >
          {sospechoso ? "Sospechoso" : "Normal"}
        </span>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 8, lineHeight: 1.5 }}>
          Estimación basada en patrones de casos históricos similares. No constituye
          una determinación de fraude.
        </p>
        {version_modelo ? (
          <div
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginTop: 6,
            }}
          >
            Modelo: {version_modelo}
          </div>
        ) : null}
      </div>
    </div>
  );
}
