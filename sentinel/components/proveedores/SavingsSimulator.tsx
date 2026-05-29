"use client";

import { useState } from "react";
import { computeSavingsEstimate } from "@/lib/claimsUtils";
import type { SiniestroCompleto } from "@/lib/types";

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export function SavingsSimulator({ claims }: { claims: SiniestroCompleto[] }) {
  const [pct, setPct] = useState(60);
  const base = computeSavingsEstimate(claims, 100);
  const savings = computeSavingsEstimate(claims, pct);
  const redCount = claims.filter((c) => c.nivel_riesgo === "ROJO").length;

  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        flexWrap: "wrap",
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderLeft: "2px solid var(--accent)",
        borderRadius: 10,
        padding: 20,
        marginTop: 16,
      }}
    >
      <div style={{ flex: 2, minWidth: 280 }}>
        <div className="label-mono" style={{ marginBottom: 6 }}>
          Simulación de impacto
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 10 }}>
          Si se investigan los casos en nivel ROJO antes de pagar, el monto potencialmente
          evitable es:
        </p>
        <div style={{ fontFamily: "var(--font-syne)", fontSize: 40, fontWeight: 700, color: "var(--risk-green)" }}>
          {money(savings)}
        </div>
        <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 8, lineHeight: 1.5 }}>
          Estimación ilustrativa sobre {redCount} casos rojos (exposición base{" "}
          {money(base)}). No garantiza recuperación real.
        </p>
      </div>

      <div style={{ flex: 1, minWidth: 200 }}>
        <div className="label-mono" style={{ marginBottom: 6 }}>
          % de recuperación estimado
        </div>
        <div style={{ fontFamily: "var(--font-syne)", fontSize: 28, fontWeight: 600, marginBottom: 8 }}>
          {pct}%
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          className="range-input"
          style={{ width: "100%" }}
          onChange={(e) => setPct(Number(e.target.value))}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: "var(--font-dm-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}
