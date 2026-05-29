"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { CatalogoRegla } from "@/lib/types";
import { ReglasCatalogTable } from "@/components/reglas/ReglasCatalogTable";

export default function ReglasPage() {
  const [reglas, setReglas] = useState<CatalogoRegla[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("catalogo_regla")
      .select("*")
      .order("codigo_regla");
    if (err) {
      setError(err.message);
    } else {
      setReglas((data ?? []) as CatalogoRegla[]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function handleUpdate(updated: CatalogoRegla) {
    setReglas((prev) => prev.map((r) => r.codigo_regla === updated.codigo_regla ? updated : r));
  }

  const totalPuntos = reglas.reduce((s, r) => s + (r.puntos_nivel_1 ?? 0), 0);
  const criticas = reglas.filter((r) => r.es_critica && r.activa).length;
  const activas = reglas.filter((r) => r.activa).length;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <ShieldCheck size={20} style={{ color: "var(--accent)" }} />
            <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-syne)", color: "var(--text-primary)" }}>
              Reglas de negocio
            </h1>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Catálogo de reglas determinísticas del motor antifraude. Edita umbrales y puntuaciones directamente.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 6, fontSize: 12,
            border: "1px solid var(--border)", background: "transparent",
            color: "var(--text-secondary)", cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "var(--font-dm-mono)",
          }}
        >
          <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Actualizar
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total reglas", value: reglas.length },
          { label: "Reglas activas", value: activas },
          { label: "Reglas críticas", value: criticas },
          { label: "Pts máx posibles", value: totalPuntos },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 8, padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-dm-mono)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              {label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-syne)", color: "var(--text-primary)" }}>
              {loading ? "—" : value}
            </div>
          </div>
        ))}
      </div>

      {/* Nota informativa */}
      <div style={{
        background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.2)",
        borderRadius: 6, padding: "10px 14px", marginBottom: 16,
        fontSize: 12, color: "var(--text-secondary)",
      }}>
        <span style={{ color: "var(--accent)", fontWeight: 600 }}>Nota: </span>
        Los cambios en umbrales y puntuaciones aplican a nuevos siniestros procesados. Para recalcular casos existentes, reprocesa desde el pipeline ML.
      </div>

      {/* Tabla o estados */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          overflow: "hidden",
          padding: 16,
        }}
      >
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)", fontFamily: "var(--font-dm-mono)", fontSize: 13 }}>
            Cargando catálogo…
          </div>
        ) : error ? (
          <div style={{
            padding: 20, background: "var(--risk-red-bg)", borderRadius: 6,
            color: "var(--risk-red)", fontSize: 13, fontFamily: "var(--font-dm-mono)",
          }}>
            Error al cargar: {error}
          </div>
        ) : reglas.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
            No hay reglas en el catálogo. Ejecuta la migración{" "}
            <code style={{ fontFamily: "var(--font-dm-mono)", color: "var(--accent)" }}>
              db/01_add_thresholds.sql
            </code>{" "}
            en Supabase SQL Editor.
          </div>
        ) : (
          <ReglasCatalogTable reglas={reglas} onUpdate={handleUpdate} />
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
