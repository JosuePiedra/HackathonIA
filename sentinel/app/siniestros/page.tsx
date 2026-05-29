"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Upload, Pencil, Trash2, RefreshCw } from "lucide-react";
import {
  getSiniestrosBase,
  createSiniestro,
  updateSiniestro,
  deleteSiniestro,
} from "@/lib/queries";
import { useData } from "@/context/DataContext";
import { SiniestroForm } from "@/components/siniestros/SiniestroForm";
import { CsvImportWizard } from "@/components/siniestros/CsvImportWizard";
import { ProcessingPanel } from "@/components/siniestros/ProcessingPanel";
import type { SiniestroBase } from "@/lib/types";

const money = (n: number) => "$" + n.toLocaleString("en-US");

export default function SiniestrosPage() {
  const { refresh, supabaseConfigured } = useData();
  const [rows, setRows] = useState<SiniestroBase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SiniestroBase | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSiniestrosBase();
      setRows(data);
      if (!supabaseConfigured) {
        setError("Supabase no está configurado. Definí las variables en .env.local.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al leer los siniestros.");
    } finally {
      setLoading(false);
    }
  }, [supabaseConfigured]);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (row: SiniestroBase) => {
    setEditing(row);
    setFormOpen(true);
  };

  const handleSave = async (data: SiniestroBase) => {
    setBusy(true);
    setNotice(null);
    const res = editing
      ? await updateSiniestro(editing.id_siniestro, data)
      : await createSiniestro(data);
    setBusy(false);
    if (!res.ok) {
      setNotice(res.error ?? "No se pudo guardar el siniestro.");
      return;
    }
    setFormOpen(false);
    setEditing(null);
    setNotice(editing ? "Siniestro actualizado." : "Siniestro creado.");
    await load();
    void refresh();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`¿Eliminar el siniestro ${id}?`)) return;
    const res = await deleteSiniestro(id);
    if (!res.ok) {
      setNotice(res.error ?? "No se pudo eliminar.");
      return;
    }
    setNotice(`Siniestro ${id} eliminado.`);
    await load();
    void refresh();
  };

  const onPickCsv = (file: File) => {
    setNotice(null);
    setCsvFile(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="page">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ fontFamily: "var(--font-syne)", fontSize: 22, fontWeight: 600 }}>
            Gestión de siniestros
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 2 }}>
            Alta, edición y carga masiva de siniestros base. El scoring lo calcula el
            backend.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} /> Recargar
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            <Upload size={14} /> Cargar CSV
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={14} /> Nuevo siniestro
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickCsv(f);
            }}
          />
        </div>
      </div>

      {notice ? (
        <div
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderLeft: "2px solid var(--accent)",
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: 13,
            color: "var(--text-secondary)",
            marginBottom: 12,
          }}
        >
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="validation-error" style={{ marginBottom: 12 }}>
          <h4>Atención</h4>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{error}</div>
        </div>
      ) : null}

      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Ramo</th>
              <th>Ciudad</th>
              <th>Monto reclamado</th>
              <th>Estado</th>
              <th>Ocurrencia</th>
              <th style={{ textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: 24 }}>
                  Cargando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: 24 }}>
                  No hay siniestros. Creá uno nuevo o cargá un CSV.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id_siniestro} className="row-hover">
                  <td className="col-id">{r.id_siniestro}</td>
                  <td>{r.ramo}</td>
                  <td>{r.ciudad}</td>
                  <td className="col-money">{money(r.monto_reclamado)}</td>
                  <td className="col-mono">{r.estado}</td>
                  <td className="col-mono">{r.fecha_ocurrencia}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: 6 }}
                        onClick={() => openEdit(r)}
                        aria-label="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn btn-ghost-red"
                        style={{ padding: 6 }}
                        onClick={() => void handleDelete(r.id_siniestro)}
                        aria-label="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {formOpen ? (
        <div
          onClick={() => setFormOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "48px 16px",
            zIndex: 50,
            overflow: "auto",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 24,
              width: "100%",
              maxWidth: 640,
            }}
          >
            <h3 style={{ fontFamily: "var(--font-syne)", fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
              {editing ? `Editar ${editing.id_siniestro}` : "Nuevo siniestro"}
            </h3>
            <SiniestroForm
              initial={editing}
              busy={busy}
              onSubmit={(d) => void handleSave(d)}
              onCancel={() => setFormOpen(false)}
            />
          </div>
        </div>
      ) : null}

      {csvFile ? (
        <CsvImportWizard
          file={csvFile}
          onClose={() => setCsvFile(null)}
          onImported={(n, ids) => {
            setCsvFile(null);
            setNotice(`${n} siniestros importados. El backend los está procesando…`);
            if (ids.length > 0) setProcessingIds(ids);
            void load();
            void refresh();
          }}
        />
      ) : null}

      {processingIds.length > 0 && (
        <ProcessingPanel
          ids={processingIds}
          onDone={() => {
            setProcessingIds([]);
            void load();
            void refresh();
          }}
        />
      )}
    </div>
  );
}
