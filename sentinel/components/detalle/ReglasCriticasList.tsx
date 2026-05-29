"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ReglaAlerta } from "@/lib/types";

interface Props {
  reglas: ReglaAlerta[];
  isLoading?: boolean;
}

function clsColor(clasificacion: string) {
  return clasificacion === "Rojo"
    ? { text: "var(--risk-red)", bg: "var(--risk-red-bg)", border: "rgba(239,68,68,0.3)" }
    : { text: "var(--risk-yellow)", bg: "var(--risk-yellow-bg)", border: "rgba(234,179,8,0.25)" };
}

export function ReglasCriticasList({ reglas, isLoading }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  if (isLoading) {
    return (
      <div style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-dm-mono)", fontSize: 12 }}>
        Cargando reglas…
      </div>
    );
  }

  if (reglas.length === 0) {
    return (
      <div
        style={{
          fontFamily: "var(--font-dm-mono)",
          fontSize: 13,
          color: "var(--risk-green)",
          background: "var(--risk-green-bg)",
          border: "1px solid rgba(34,197,94,0.25)",
          borderRadius: 6,
          padding: "10px 12px",
        }}
      >
        Sin reglas críticas activadas
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {reglas.map((r) => {
        const c = clsColor(r.clasificacion);
        const isOpen = open[r.id_alerta] ?? false;
        const hasDetail =
          r.variable_evaluada || r.valor_detectado || r.evidencia || r.explicacion;
        return (
          <div
            key={r.id_alerta}
            style={{
              border: `1px solid var(--border)`,
              borderLeft: `2px solid ${c.text}`,
              borderRadius: 6,
              background: "var(--bg-elevated)",
            }}
          >
            <button
              onClick={() => setOpen((o) => ({ ...o, [r.id_alerta]: !isOpen }))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 12px",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-dm-mono)",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 4,
                  color: c.text,
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                }}
              >
                {r.codigo_regla}
              </span>
              <span style={{ fontSize: 13, color: "var(--text-primary)", flex: 1 }}>
                {r.nombre_regla}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-dm-mono)",
                  fontSize: 10,
                  textTransform: "uppercase",
                  color: c.text,
                }}
              >
                {r.clasificacion}
              </span>
              {hasDetail ? (
                <ChevronDown
                  size={14}
                  style={{
                    color: "var(--text-tertiary)",
                    transform: isOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.15s",
                  }}
                />
              ) : null}
            </button>
            {isOpen && hasDetail ? (
              <div
                style={{
                  padding: "0 12px 12px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 12,
                  color: "var(--text-secondary)",
                }}
              >
                {r.severidad ? <div>Severidad: {r.severidad}</div> : null}
                {r.variable_evaluada ? <div>Variable: {r.variable_evaluada}</div> : null}
                {r.valor_detectado ? <div>Valor detectado: {r.valor_detectado}</div> : null}
                {r.evidencia ? <div>Evidencia: {r.evidencia}</div> : null}
                {r.explicacion ? (
                  <div style={{ color: "var(--text-primary)" }}>{r.explicacion}</div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
