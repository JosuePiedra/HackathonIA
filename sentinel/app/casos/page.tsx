"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { useData } from "@/context/DataContext";
import { filterClaims } from "@/lib/claimsUtils";
import { CasosFilters } from "@/components/casos/CasosFilters";
import { CasosTable } from "@/components/casos/CasosTable";
import { LoadingState } from "@/components/shared/LoadingState";
import type { FilterState } from "@/lib/types";

const DEFAULT_FILTERS: FilterState = {
  nivel_riesgo: [],
  ramos: [],
  ciudades: [],
  proveedor: "",
  score_min: 0,
  score_max: 100,
  con_reglas_criticas: false,
  documentos_incompletos: false,
};

function CasosContent() {
  const { claims, connected, isLoading, error } = useData();
  const searchParams = useSearchParams();
  const q = searchParams.get("q")?.toLowerCase() ?? "";
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const filtered = useMemo(() => {
    let rows = filterClaims(claims, filters);
    if (q) rows = rows.filter((c) => c.id_siniestro.toLowerCase().includes(q));
    return rows.sort((a, b) => b.score_final - a.score_final);
  }, [claims, filters, q]);

  const exportClaims = async (type: "red" | "top10" | "executive", file: string) => {
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, claims: filtered }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* exportación no disponible */
    }
  };

  if (isLoading || (!connected && !error)) {
    return <LoadingState cards={3} />;
  }

  if (!connected || claims.length === 0) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--text-secondary)" }}>
          <h3 style={{ fontFamily: "var(--font-syne)", fontSize: 18, marginBottom: 8 }}>
            Sin casos para mostrar
          </h3>
          <p style={{ fontSize: 13, marginBottom: 16 }}>
            {connected
              ? "No hay siniestros scoreados todavía."
              : "Conectá Supabase desde el inicio."}
          </p>
          <Link href="/siniestros" className="btn btn-primary">
            Gestionar siniestros
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="casos-layout" style={{ flex: 1, minHeight: 0 }}>
        <CasosFilters claims={claims} filters={filters} onChange={setFilters} />

        <div className="cases-panel">
          <div className="cases-toolbar">
            <div className="info">
              <span style={{ color: "var(--text-primary)" }}>{filtered.length}</span> casos
              {filtered.length !== claims.length ? (
                <span style={{ color: "var(--text-tertiary)" }}> · {claims.length} total</span>
              ) : null}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost-red" onClick={() => void exportClaims("red", "casos_rojos.csv")}>
                <Download size={14} /> Casos rojos
              </button>
              <button className="btn btn-ghost" onClick={() => void exportClaims("top10", "top10_riesgo.csv")}>
                <Download size={14} /> Top 10 riesgo
              </button>
              <button className="btn btn-ghost" onClick={() => void exportClaims("executive", "reporte_ejecutivo.html")}>
                <FileText size={14} /> Reporte HTML
              </button>
            </div>
          </div>

          <div className="cases-scroll" style={{ overflow: "auto" }}>
            <CasosTable claims={filtered} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CasosPage() {
  return (
    <Suspense fallback={<div className="page">Cargando…</div>}>
      <CasosContent />
    </Suspense>
  );
}
