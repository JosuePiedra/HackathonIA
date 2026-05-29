"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, Download, ChevronDown } from "lucide-react";
import { useData } from "@/context/DataContext";

const SECTION_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  casos: "Bandeja de casos",
  red: "Red de relaciones",
  proveedores: "Proveedores",
  agente: "Agente IA",
};

const EXPORTS: { type: "red" | "top10" | "executive"; label: string; file: string }[] = [
  { type: "red", label: "CSV — casos rojos", file: "casos_rojos.csv" },
  { type: "top10", label: "CSV — Top 10 riesgo", file: "top10_riesgo.csv" },
  { type: "executive", label: "Reporte ejecutivo (HTML)", file: "reporte_ejecutivo.html" },
];

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { claims } = useData();
  const [query, setQuery] = useState("");
  const [exportOpen, setExportOpen] = useState(false);

  const segments = pathname.split("/").filter(Boolean);
  const section = SECTION_LABELS[segments[0] ?? ""] ?? "";
  const detailId = segments[0] === "casos" && segments[1] ? segments[1] : null;

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const id = query.trim();
    if (!id) return;
    const match = claims.find(
      (c) => c.id_siniestro.toLowerCase() === id.toLowerCase(),
    );
    if (match) router.push(`/casos/${match.id_siniestro}`);
    else router.push(`/casos?q=${encodeURIComponent(id)}`);
  };

  const handleExport = async (type: "red" | "top10" | "executive", file: string) => {
    setExportOpen(false);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, claims }),
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

  return (
    <div className="topbar">
      <div className="breadcrumb">
        <span>Sentinel</span>
        <span className="sep">/</span>
        <span className="current">{section}</span>
        {detailId ? (
          <>
            <span className="sep">/</span>
            <span className="current mono">{detailId}</span>
          </>
        ) : null}
      </div>

      <form className="search-box" onSubmit={onSearch}>
        <Search size={14} />
        <input
          className="placeholder"
          style={{ width: "100%", background: "transparent" }}
          placeholder="Buscar siniestro por ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>

      <div style={{ position: "relative" }}>
        <button className="btn btn-ghost" onClick={() => setExportOpen((v) => !v)}>
          <Download size={14} /> Exportar <ChevronDown size={14} />
        </button>
        {exportOpen ? (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 6px)",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 6,
              minWidth: 220,
              zIndex: 20,
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            {EXPORTS.map((ex) => (
              <button
                key={ex.type}
                onClick={() => handleExport(ex.type, ex.file)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: 6,
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
                className="row-hover"
              >
                {ex.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
