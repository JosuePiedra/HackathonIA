"use client";

import { useRouter } from "next/navigation";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { ScoreBar } from "@/components/casos/ScoreBar";
import { RED_RULE_CODES } from "@/lib/constants";
import type { SiniestroCompleto, RiskLevel } from "@/lib/types";

const BAR_COLOR: Record<RiskLevel, string> = {
  VERDE: "green",
  AMARILLO: "yellow",
  ROJO: "red",
};

const money = (n: number) => n.toLocaleString("en-US");

function RuleChips({ reglas }: { reglas: string }) {
  const codes = reglas
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  if (codes.length === 0)
    return <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>—</span>;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {codes.map((code) => {
        const rojo = (RED_RULE_CODES as readonly string[]).includes(code);
        return (
          <span
            key={code}
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 4,
              color: rojo ? "var(--risk-red)" : "var(--risk-yellow)",
              background: rojo ? "var(--risk-red-bg)" : "var(--risk-yellow-bg)",
              border: `1px solid ${rojo ? "rgba(239,68,68,0.3)" : "rgba(234,179,8,0.25)"}`,
            }}
          >
            {code}
          </span>
        );
      })}
    </div>
  );
}

export function CasosTable({ claims }: { claims: SiniestroCompleto[] }) {
  const router = useRouter();

  return (
    <table className="table">
      <thead>
        <tr>
          <th>ID Siniestro</th>
          <th>Nivel</th>
          <th>Reglas</th>
          <th>Score</th>
          <th>ML</th>
          <th>Ramo</th>
          <th>Ciudad</th>
          <th>Proveedor</th>
          <th style={{ textAlign: "right" }}>Monto</th>
        </tr>
      </thead>
      <tbody>
        {claims.map((c) => (
          <tr
            key={c.id_siniestro}
            className="row-hover"
            onClick={() => router.push(`/casos/${c.id_siniestro}`)}
          >
            <td className="col-id">{c.id_siniestro}</td>
            <td>
              <RiskBadge level={c.nivel_riesgo} />
            </td>
            <td>
              <RuleChips reglas={c.reglas_criticas_activadas} />
            </td>
            <td>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 90 }}>
                <span className="col-score" style={{ color: `var(--risk-${BAR_COLOR[c.nivel_riesgo]})` }}>
                  {Math.round(c.score_final)}
                </span>
                <ScoreBar value={c.score_final} color={BAR_COLOR[c.nivel_riesgo]} />
              </div>
            </td>
            <td className="col-mono">{Math.round(c.probabilidad_ml * 100)}%</td>
            <td>{c.ramo}</td>
            <td>{c.ciudad}</td>
            <td className="col-mono">{c.id_proveedor}</td>
            <td className="col-money">
              <span className="dollar">$</span>
              {money(c.monto_reclamado)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
