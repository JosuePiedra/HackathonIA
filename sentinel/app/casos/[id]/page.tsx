"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useData } from "@/context/DataContext";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { ScoreBreakdown } from "@/components/detalle/ScoreBreakdown";
import { NarrativeAnalysis } from "@/components/detalle/NarrativeAnalysis";
import { EthicsMessage } from "@/components/detalle/EthicsMessage";
import type { ReglaAlerta } from "@/lib/types";

const money = (n: number) => "$" + (n || 0).toLocaleString("en-US");

function DataCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="data-cell">
      <div className="lbl" style={{ fontFamily: "var(--font-dm-mono)", fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </div>
      <div className="val" style={{ fontSize: 14, color: "var(--text-primary)" }}>
        {value || "—"}
      </div>
    </div>
  );
}

export default function DetalleSiniestroPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");
  const { claims, isLoading, getReglasBySiniestroId } = useData();
  const [reglas, setReglas] = useState<ReglaAlerta[]>([]);
  const [reglasLoading, setReglasLoading] = useState(true);

  const siniestro = claims.find((c) => c.id_siniestro === id);

  useEffect(() => {
    let active = true;
    setReglasLoading(true);
    getReglasBySiniestroId(id)
      .then((r) => {
        if (active) setReglas(r);
      })
      .finally(() => {
        if (active) setReglasLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, getReglasBySiniestroId]);

  if (!siniestro) {
    return (
      <div className="page">
        <Link href="/casos" className="btn btn-ghost" style={{ marginBottom: 16 }}>
          <ArrowLeft size={14} /> Volver a bandeja
        </Link>
        <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--text-secondary)" }}>
          {isLoading ? "Cargando…" : `Siniestro ${id} no encontrado.`}
        </div>
      </div>
    );
  }

  const ratio =
    (siniestro.suma_asegurada ?? 0) > 0
      ? (siniestro.monto_reclamado / (siniestro.suma_asegurada ?? 1)).toFixed(2)
      : "—";

  const dias = (() => {
    const a = new Date(siniestro.fecha_ocurrencia ?? "").getTime();
    const b = new Date(siniestro.fecha_reporte ?? "").getTime();
    const d = Math.round((b - a) / 86_400_000);
    return Number.isFinite(d) ? `${d} días` : "—";
  })();

  const riskColor = `var(--risk-${siniestro.nivel_riesgo === "Rojo" ? "red" : siniestro.nivel_riesgo === "Amarillo" ? "yellow" : "green"})`;

  return (
    <div className="page" style={{ paddingBottom: 90 }}>
      <Link href="/casos" className="btn btn-ghost" style={{ marginBottom: 16 }}>
        <ArrowLeft size={14} /> Volver a bandeja
      </Link>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "var(--font-syne)", fontSize: 26, fontWeight: 600 }}>
            {siniestro.id_siniestro}
          </div>
          <div style={{ fontFamily: "var(--font-dm-mono)", fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
            {siniestro.ramo} · {siniestro.cobertura} · {siniestro.ciudad}
          </div>
        </div>
        <RiskBadge level={siniestro.nivel_riesgo ?? "Verde"} size="lg" />
      </div>

      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderLeft: `2px solid ${riskColor}`,
          borderRadius: 8,
          padding: "12px 14px",
          fontSize: 13,
          color: "var(--text-primary)",
          marginBottom: 16,
        }}
      >
        <span style={{ fontFamily: "var(--font-dm-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", marginRight: 8 }}>
          Acción sugerida:
        </span>
        {siniestro.accion_sugerida || "—"}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
        {/* Columna izquierda */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <ScoreBreakdown siniestro={siniestro} reglas={reglas} reglasLoading={reglasLoading} />
          <NarrativeAnalysis siniestro={siniestro} allClaims={claims} />
        </div>

        {/* Columna derecha */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <div className="card">
            <div className="label-mono" style={{ marginBottom: 14 }}>Datos del reclamo</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <DataCell label="Asegurado" value={siniestro.id_asegurado ?? ""} />
              <DataCell label="Proveedor" value={siniestro.id_proveedor ?? ""} />
              <DataCell label="Ramo" value={siniestro.ramo ?? ""} />
              <DataCell label="Cobertura" value={siniestro.cobertura ?? ""} />
              <DataCell label="Ciudad" value={siniestro.ciudad ?? ""} />
              <DataCell label="Días a reporte" value={dias} />
              <DataCell label="Fecha ocurrencia" value={siniestro.fecha_ocurrencia ?? ""} />
              <DataCell label="Fecha reporte" value={siniestro.fecha_reporte ?? ""} />
              <DataCell label="Vigencia" value={`${siniestro.fecha_inicio_poliza ?? ""} → ${siniestro.fecha_fin_poliza ?? ""}`} />
              <DataCell label="Estado" value={siniestro.estado ?? ""} />
            </div>
          </div>

          <div className="card">
            <div className="label-mono" style={{ marginBottom: 14 }}>Montos</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <DataCell label="Reclamado" value={money(siniestro.monto_reclamado)} />
              <DataCell label="Estimado" value={money(siniestro.monto_estimado)} />
              <DataCell label="Pagado" value={money(siniestro.monto_pagado)} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)", fontSize: 13 }}>
              <span style={{ color: "var(--text-tertiary)" }}>Suma asegurada</span>
              <span style={{ fontFamily: "var(--font-dm-mono)" }}>{money(siniestro.suma_asegurada ?? 0)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13 }}>
              <span style={{ color: "var(--text-tertiary)" }}>Ratio reclamado / suma asegurada</span>
              <span style={{ fontFamily: "var(--font-dm-mono)" }}>{ratio}</span>
            </div>
          </div>

          <div className="card">
            <div className="label-mono" style={{ marginBottom: 14 }}>Flags de riesgo</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12 }}>
              <Flag on={!siniestro.documentos_completos} label="Documentos incompletos" />
              <Flag on={siniestro.en_lista_restrictiva ?? false} label="Proveedor en lista restrictiva" />
              <Flag on={Boolean((siniestro.reglas_criticas_activadas ?? "").trim())} label="Reglas críticas activadas" />
              <Flag on={siniestro.prediccion_ml === 1} label="ML: sospechoso" />
            </div>
          </div>
        </div>
      </div>

      {/* Explicación del sistema — persistida en Supabase, NO se regenera */}
      <div
        style={{
          marginTop: 16,
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderLeft: "2px solid var(--accent)",
          borderRadius: 8,
          padding: 16,
        }}
      >
        <div className="label-mono" style={{ marginBottom: 6 }}>Explicación del sistema</div>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-primary)" }}>
          {siniestro.explicacion_final || "Sin explicación disponible."}
        </p>
      </div>

      <div style={{ marginTop: 16 }}>
        <EthicsMessage mensaje={siniestro.mensaje_ia ?? undefined} />
      </div>

      {siniestro.fecha_evaluacion ? (
        <div style={{ marginTop: 12, fontFamily: "var(--font-dm-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>
          Evaluado: {siniestro.fecha_evaluacion}
        </div>
      ) : null}

      <Link
        href={`/agente?siniestro=${siniestro.id_siniestro}`}
        className="btn btn-primary"
        style={{ position: "fixed", right: 28, bottom: 28, zIndex: 30, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
      >
        <Sparkles size={14} /> Consultar al agente
      </Link>
    </div>
  );
}

function Flag({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        color: on ? "var(--risk-red)" : "var(--text-tertiary)",
        background: on ? "var(--risk-red-bg)" : "var(--bg-elevated)",
        border: `1px solid ${on ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
      }}
    >
      {label}
    </span>
  );
}
