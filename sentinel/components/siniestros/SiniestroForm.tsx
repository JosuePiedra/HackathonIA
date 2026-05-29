"use client";

import { useState, type CSSProperties } from "react";
import type { SiniestroBase } from "@/lib/types";

const RAMOS = ["Vehículos", "Salud", "Vida", "Hogar"];
const ESTADOS = ["Pendiente", "En análisis", "Pagado", "Rechazado"];

const labelStyle: CSSProperties = {
  fontSize: 11,
  color: "var(--text-tertiary)",
  fontFamily: "var(--font-dm-mono)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 4,
  display: "block",
};
const inputStyle: CSSProperties = {
  width: "100%",
  background: "var(--bg-base)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 13,
  color: "var(--text-primary)",
  fontFamily: "var(--font-dm-sans)",
};

const EMPTY: SiniestroBase = {
  id_siniestro: "",
  id_poliza: "",
  id_asegurado: "",
  id_vehiculo: "",
  id_proveedor: "",
  ramo: "Vehículos",
  cobertura: "",
  ciudad: "",
  fecha_ocurrencia: "",
  fecha_reporte: "",
  monto_reclamado: 0,
  monto_estimado: 0,
  monto_pagado: 0,
  estado: "Pendiente",
  descripcion: "",
  documentos_completos: false,
  etiqueta_fraude_simulada: 0,
};

interface SiniestroFormProps {
  initial?: SiniestroBase | null;
  busy?: boolean;
  onSubmit: (data: SiniestroBase) => void;
  onCancel: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export function SiniestroForm({ initial, busy, onSubmit, onCancel }: SiniestroFormProps) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState<SiniestroBase>(initial ?? EMPTY);
  const [touched, setTouched] = useState(false);

  const set = <K extends keyof SiniestroBase>(key: K, value: SiniestroBase[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const num = (v: string) => (v === "" ? 0 : Number(v));

  const valid = form.id_siniestro.trim() && (form.ramo ?? "").trim() && (form.ciudad ?? "").trim();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    onSubmit({ ...form, id_siniestro: form.id_siniestro.trim() });
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="ID Siniestro *">
          <input
            style={inputStyle}
            value={form.id_siniestro}
            disabled={isEdit}
            placeholder="SIN-2026-1234"
            onChange={(e) => set("id_siniestro", e.target.value)}
          />
        </Field>
        <Field label="ID Póliza">
          <input style={inputStyle} value={form.id_poliza ?? ""} onChange={(e) => set("id_poliza", e.target.value)} />
        </Field>
        <Field label="ID Asegurado">
          <input style={inputStyle} value={form.id_asegurado ?? ""} onChange={(e) => set("id_asegurado", e.target.value)} />
        </Field>
        <Field label="ID Vehículo">
          <input style={inputStyle} value={form.id_vehiculo ?? ""} onChange={(e) => set("id_vehiculo", e.target.value)} />
        </Field>
        <Field label="ID Proveedor">
          <input style={inputStyle} value={form.id_proveedor ?? ""} onChange={(e) => set("id_proveedor", e.target.value)} />
        </Field>
        <Field label="Ramo *">
          <select style={inputStyle} value={form.ramo ?? ""} onChange={(e) => set("ramo", e.target.value)}>
            {RAMOS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cobertura">
          <input style={inputStyle} value={form.cobertura ?? ""} onChange={(e) => set("cobertura", e.target.value)} />
        </Field>
        <Field label="Ciudad *">
          <input style={inputStyle} value={form.ciudad ?? ""} onChange={(e) => set("ciudad", e.target.value)} />
        </Field>
        <Field label="Fecha ocurrencia">
          <input type="date" style={inputStyle} value={form.fecha_ocurrencia ?? ""} onChange={(e) => set("fecha_ocurrencia", e.target.value)} />
        </Field>
        <Field label="Fecha reporte">
          <input type="date" style={inputStyle} value={form.fecha_reporte ?? ""} onChange={(e) => set("fecha_reporte", e.target.value)} />
        </Field>
        <Field label="Monto reclamado">
          <input type="number" style={inputStyle} value={form.monto_reclamado} onChange={(e) => set("monto_reclamado", num(e.target.value))} />
        </Field>
        <Field label="Monto estimado">
          <input type="number" style={inputStyle} value={form.monto_estimado} onChange={(e) => set("monto_estimado", num(e.target.value))} />
        </Field>
        <Field label="Monto pagado">
          <input type="number" style={inputStyle} value={form.monto_pagado} onChange={(e) => set("monto_pagado", num(e.target.value))} />
        </Field>
        <Field label="Estado">
          <select style={inputStyle} value={form.estado ?? ""} onChange={(e) => set("estado", e.target.value)}>
            {ESTADOS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Descripción">
        <textarea
          style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
          value={form.descripcion ?? ""}
          onChange={(e) => set("descripcion", e.target.value)}
        />
      </Field>

      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
          <input
            type="checkbox"
            checked={form.documentos_completos}
            onChange={(e) => set("documentos_completos", e.target.checked)}
          />
          Documentos completos
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
          <input
            type="checkbox"
            checked={form.etiqueta_fraude_simulada === 1}
            onChange={(e) => set("etiqueta_fraude_simulada", e.target.checked ? 1 : 0)}
          />
          Etiqueta fraude (simulada)
        </label>
      </div>

      {touched && !valid ? (
        <div style={{ color: "var(--risk-red)", fontSize: 12 }}>
          ID Siniestro, Ramo y Ciudad son obligatorios.
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear siniestro"}
        </button>
      </div>
    </form>
  );
}
