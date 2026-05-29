import { RiskBadge } from "@/components/shared/RiskBadge";
import { ScoreBar } from "@/components/casos/ScoreBar";
import { ReglasCriticasList } from "./ReglasCriticasList";
import { MLInsight } from "./MLInsight";
import type { SiniestroCompleto, ReglaAlerta } from "@/lib/types";

interface Props {
  siniestro: SiniestroCompleto;
  reglas: ReglaAlerta[];
  reglasLoading?: boolean;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="label-mono" style={{ marginBottom: 10 }}>
      {children}
    </div>
  );
}

export function ScoreBreakdown({ siniestro, reglas, reglasLoading }: Props) {
  const factores = siniestro.factores_principales
    .split(/[;,]/)
    .map((f) => f.trim())
    .filter(Boolean);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Capa 1 — Reglas críticas */}
      <div className="card">
        <SectionTitle>Capa 1 · Reglas críticas activadas</SectionTitle>
        <ReglasCriticasList reglas={reglas} isLoading={reglasLoading} />
      </div>

      {/* Capa 2 — Score heurístico */}
      <div className="card">
        <SectionTitle>Capa 2 · Análisis heurístico</SectionTitle>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
          <span style={{ fontFamily: "var(--font-syne)", fontSize: 28, fontWeight: 600 }}>
            {Math.round(siniestro.score_heuristico)}
          </span>
          <span style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-mono)", fontSize: 12 }}>
            / 100
          </span>
        </div>
        <ScoreBar value={siniestro.score_heuristico} color="purple" />
        {factores.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {factores.map((f, i) => (
              <span
                key={i}
                style={{
                  fontSize: 12,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                {f}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Capa 3 — Modelo ML */}
      <div className="card">
        <SectionTitle>Capa 3 · Modelo de aprendizaje automático</SectionTitle>
        <MLInsight
          prediccion_ml={siniestro.prediccion_ml}
          probabilidad_ml={siniestro.probabilidad_ml}
        />
      </div>

      {/* Score final */}
      <div className="card">
        <SectionTitle>Score final consolidado</SectionTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div
            style={{
              fontFamily: "var(--font-syne)",
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1,
              color: `var(--risk-${siniestro.nivel_riesgo === "ROJO" ? "red" : siniestro.nivel_riesgo === "AMARILLO" ? "yellow" : "green"})`,
            }}
          >
            {Math.round(siniestro.score_final)}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <RiskBadge level={siniestro.nivel_riesgo} size="lg" />
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 10, lineHeight: 1.5 }}>
              <span
                style={{
                  fontFamily: "var(--font-dm-mono)",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--text-tertiary)",
                  marginRight: 6,
                }}
              >
                Acción sugerida:
              </span>
              {siniestro.accion_sugerida || "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
