"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Sparkles, X, ArrowLeft, Upload, AlertTriangle } from "lucide-react";
import { parseRawCSV, normalizeSiniestroBaseRow } from "@/lib/parseCSV";
import { getExistingIds, bulkInsertSiniestros, type ExistingIds } from "@/lib/queries";
import { SINIESTRO_COLUMNS, type SiniestroColumn } from "@/lib/constants";

type RawRow = Record<string, string>;
type Phase = "loading" | "mapping" | "review" | "importing";

interface Sets {
  siniestros: Set<string>;
  polizas: Set<string>;
  asegurados: Set<string>;
  vehiculos: Set<string>;
  proveedores: Set<string>;
}

const FK_CHECKS: { col: SiniestroColumn; set: keyof Sets; label: string }[] = [
  { col: "id_poliza", set: "polizas", label: "Póliza inexistente" },
  { col: "id_asegurado", set: "asegurados", label: "Asegurado inexistente" },
  { col: "id_vehiculo", set: "vehiculos", label: "Vehículo inexistente" },
  { col: "id_proveedor", set: "proveedores", label: "Proveedor inexistente" },
];

const toSets = (e: ExistingIds): Sets => ({
  siniestros: new Set(e.siniestros),
  polizas: new Set(e.polizas),
  asegurados: new Set(e.asegurados),
  vehiculos: new Set(e.vehiculos),
  proveedores: new Set(e.proveedores),
});

const inputStyle: CSSProperties = {
  background: "var(--bg-base)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 12,
  color: "var(--text-primary)",
  fontFamily: "var(--font-dm-sans)",
};

interface Props {
  file: File;
  onClose: () => void;
  onImported: (n: number) => void;
}

export function CsvImportWizard({ file, onClose, onImported }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [colMapping, setColMapping] = useState<Record<string, string>>({}); // siniestroCol -> csvHeader|""
  const [editedRows, setEditedRows] = useState<RawRow[]>([]);
  const [sets, setSets] = useState<Sets | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const text = await file.text();
        const { headers: h, rows } = await parseRawCSV(text);
        if (!active) return;
        if (h.length === 0 || rows.length === 0) {
          setError("El CSV está vacío o no tiene encabezados.");
          return;
        }
        setHeaders(h);
        setRawRows(rows);

        // IDs existentes (para validar FK) en paralelo con el mapeo IA.
        const idsPromise = getExistingIds();
        const res = await fetch("/api/csv-map", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ headers: h, sample: rows.slice(0, 3) }),
        });
        const data = (await res.json()) as { mapping?: Record<string, string | null>; error?: string };
        const ids = await idsPromise;
        if (!active) return;
        setSets(toSets(ids));

        // Invertir el mapeo IA (header->col) a (col->header).
        const inv: Record<string, string> = {};
        const aiMap = data.mapping ?? {};
        for (const [header, col] of Object.entries(aiMap)) {
          if (col && SINIESTRO_COLUMNS.includes(col as SiniestroColumn) && !inv[col]) {
            inv[col] = header;
          }
        }
        const initial: Record<string, string> = {};
        for (const col of SINIESTRO_COLUMNS) initial[col] = inv[col] ?? "";
        setColMapping(initial);
        setPhase("mapping");
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Error al analizar el CSV.");
      }
    })();
    return () => {
      active = false;
    };
  }, [file]);

  const goReview = () => {
    const mapped = rawRows.map((r) => {
      const row: RawRow = {};
      for (const col of SINIESTRO_COLUMNS) {
        const header = colMapping[col];
        row[col] = header ? (r[header] ?? "").trim() : "";
      }
      return row;
    });
    setEditedRows(mapped);
    setPhase("review");
  };

  // Validación de la grilla de revisión.
  const errors = useMemo(() => {
    const result: Record<number, Partial<Record<SiniestroColumn, string>>> = {};
    if (!sets) return result;
    const seen = new Set<string>();
    editedRows.forEach((row, i) => {
      const e: Partial<Record<SiniestroColumn, string>> = {};
      const id = (row.id_siniestro ?? "").trim();
      if (!id) e.id_siniestro = "Requerido";
      else if (seen.has(id)) e.id_siniestro = "Duplicado en el CSV";
      else if (sets.siniestros.size > 0 && sets.siniestros.has(id))
        e.id_siniestro = "Ya existe en la base";
      if (id) seen.add(id);
      if (!(row.ramo ?? "").trim()) e.ramo = "Requerido";
      if (!(row.ciudad ?? "").trim()) e.ciudad = "Requerido";
      for (const fk of FK_CHECKS) {
        const v = (row[fk.col] ?? "").trim();
        // Solo validamos contra una tabla si pudimos leer sus IDs (evita falsos positivos por RLS).
        if (v && sets[fk.set].size > 0 && !sets[fk.set].has(v)) e[fk.col] = fk.label;
      }
      for (const m of ["monto_reclamado", "monto_estimado", "monto_pagado"] as const) {
        const v = (row[m] ?? "").trim();
        if (v && Number.isNaN(Number(v))) e[m] = "Número inválido";
      }
      if (Object.keys(e).length > 0) result[i] = e;
    });
    return result;
  }, [editedRows, sets]);

  const errorCount = useMemo(
    () => Object.values(errors).reduce((s, e) => s + Object.keys(e).length, 0),
    [errors],
  );

  const setCell = (rowIdx: number, col: SiniestroColumn, value: string) =>
    setEditedRows((rows) => rows.map((r, i) => (i === rowIdx ? { ...r, [col]: value } : r)));

  const doImport = async () => {
    if (errorCount > 0) return;
    setPhase("importing");
    const base = editedRows.map(normalizeSiniestroBaseRow);
    const res = await bulkInsertSiniestros(base);
    if (!res.ok) {
      setError(res.error ?? "No se pudieron importar los siniestros.");
      setPhase("review");
      return;
    }
    onImported(res.inserted);
  };

  const mappedCount = Object.values(colMapping).filter(Boolean).length;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "32px 16px",
        zIndex: 60,
        overflow: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          width: "100%",
          maxWidth: 1100,
          padding: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h3 style={{ fontFamily: "var(--font-syne)", fontSize: 18, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} style={{ color: "var(--accent)" }} /> Importar CSV con IA
          </h3>
          <button onClick={onClose} aria-label="Cerrar">
            <X size={18} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>
        <div style={{ fontFamily: "var(--font-dm-mono)", fontSize: 11, color: "var(--text-tertiary)", marginBottom: 16 }}>
          {file.name}
        </div>

        {error ? (
          <div className="validation-error" style={{ marginBottom: 16 }}>
            <h4>Atención</h4>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{error}</div>
          </div>
        ) : null}

        {phase === "loading" ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
            <Sparkles size={28} style={{ color: "var(--accent)" }} />
            <p style={{ marginTop: 10 }}>Analizando el CSV y emparejando columnas con IA…</p>
          </div>
        ) : null}

        {/* ── Fase 1: Mapeo ── */}
        {phase === "mapping" ? (
          <>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>
              La IA emparejó {mappedCount} de {SINIESTRO_COLUMNS.length} columnas. Revisá y ajustá los
              emparejamientos antes de continuar.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, maxHeight: 420, overflow: "auto" }}>
              {SINIESTRO_COLUMNS.map((col) => {
                const header = colMapping[col] ?? "";
                const sampleVal = header ? rawRows[0]?.[header] ?? "" : "";
                return (
                  <div key={col} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10, background: "var(--bg-base)" }}>
                    <div style={{ fontFamily: "var(--font-dm-mono)", fontSize: 11, color: "var(--text-primary)", marginBottom: 6 }}>
                      {col}
                    </div>
                    <select
                      style={{ ...inputStyle, width: "100%" }}
                      value={header}
                      onChange={(e) => setColMapping((m) => ({ ...m, [col]: e.target.value }))}
                    >
                      <option value="">— sin mapear —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    {header ? (
                      <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        ej: {sampleVal || "—"}
                      </div>
                    ) : (
                      <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 4 }}>quedará vacío</div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={onClose}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={goReview}>
                Continuar a revisión ({rawRows.length} filas)
              </button>
            </div>
          </>
        ) : null}

        {/* ── Fase 2: Revisión ── */}
        {phase === "review" || phase === "importing" ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
                fontSize: 13,
                color: errorCount > 0 ? "var(--risk-red)" : "var(--risk-green)",
              }}
            >
              {errorCount > 0 ? (
                <>
                  <AlertTriangle size={15} /> {errorCount} celda(s) con problemas — corregilas (en rojo) para
                  poder importar.
                </>
              ) : (
                <>Todo listo: {editedRows.length} filas válidas para importar.</>
              )}
            </div>

            <div style={{ overflow: "auto", maxHeight: 440, border: "1px solid var(--border)", borderRadius: 8 }}>
              <table style={{ borderCollapse: "collapse", fontSize: 12, whiteSpace: "nowrap" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    {SINIESTRO_COLUMNS.map((col) => (
                      <th key={col} style={thStyle}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {editedRows.map((row, i) => (
                    <tr key={i}>
                      <td style={{ ...tdStyle, color: "var(--text-tertiary)" }}>{i + 1}</td>
                      {SINIESTRO_COLUMNS.map((col) => {
                        const err = errors[i]?.[col];
                        return (
                          <td key={col} style={tdStyle}>
                            <input
                              value={row[col] ?? ""}
                              onChange={(e) => setCell(i, col, e.target.value)}
                              title={err}
                              style={{
                                ...inputStyle,
                                width: 130,
                                borderColor: err ? "var(--risk-red)" : "var(--border)",
                                background: err ? "var(--risk-red-bg)" : "var(--bg-base)",
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setPhase("mapping")} disabled={phase === "importing"}>
                <ArrowLeft size={14} /> Volver al mapeo
              </button>
              <button
                className="btn btn-primary"
                onClick={() => void doImport()}
                disabled={errorCount > 0 || phase === "importing"}
              >
                <Upload size={14} />
                {phase === "importing" ? "Importando…" : `Importar ${editedRows.length} siniestros`}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

const thStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  background: "var(--bg-elevated)",
  borderBottom: "1px solid var(--border)",
  padding: "8px 10px",
  textAlign: "left",
  fontFamily: "var(--font-dm-mono)",
  fontSize: 10,
  textTransform: "uppercase",
  color: "var(--text-tertiary)",
  zIndex: 1,
};
const tdStyle: CSSProperties = {
  padding: "4px 6px",
  borderBottom: "1px solid var(--border)",
};
