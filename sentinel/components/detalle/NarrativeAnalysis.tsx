import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { SiniestroCompleto } from "@/lib/types";

interface Props {
  siniestro: SiniestroCompleto;
  allClaims: SiniestroCompleto[];
}

export function NarrativeAnalysis({ siniestro, allClaims }: Props) {
  if (!siniestro.descripcion) return null;

  const tieneRF07 = siniestro.reglas_criticas_activadas
    .split(",")
    .map((c) => c.trim())
    .includes("RF-07");

  const similares = allClaims.filter(
    (c) =>
      c.id_siniestro !== siniestro.id_siniestro &&
      c.descripcion &&
      c.descripcion === siniestro.descripcion,
  );

  return (
    <div className="card">
      <div className="label-mono" style={{ marginBottom: 8 }}>
        Análisis narrativo
      </div>
      <div
        style={{
          fontFamily: "var(--font-dm-mono)",
          fontSize: 12.5,
          lineHeight: 1.6,
          color: "var(--text-secondary)",
          background: "var(--bg-base)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "12px 14px",
        }}
      >
        {siniestro.descripcion}
      </div>

      {(tieneRF07 || similares.length > 0) && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            marginTop: 12,
            color: "var(--risk-yellow)",
            fontSize: 12.5,
          }}
        >
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            {tieneRF07
              ? "Se detectó similitud narrativa con otros siniestros (RF-07)."
              : "Descripción muy similar a otros siniestros."}
            {similares.length > 0 ? (
              <div style={{ marginTop: 4 }}>
                Similar a:{" "}
                {similares.slice(0, 5).map((s, i) => (
                  <span key={s.id_siniestro}>
                    {i > 0 ? ", " : ""}
                    <Link
                      href={`/casos/${s.id_siniestro}`}
                      style={{ color: "var(--accent)", textDecoration: "underline" }}
                    >
                      {s.id_siniestro}
                    </Link>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
