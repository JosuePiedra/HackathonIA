"use client";

import { useState } from "react";
import { Pencil, Save, X, ChevronDown, ChevronUp } from "lucide-react";
import type { CatalogoRegla } from "@/lib/types";
import { supabase } from "@/lib/supabase";

interface Props {
  reglas: CatalogoRegla[];
  onUpdate: (updated: CatalogoRegla) => void;
}

const CLASIFICACION_COLORS: Record<string, { text: string; bg: string }> = {
  Rojo:     { text: "var(--risk-red)",    bg: "var(--risk-red-bg)" },
  Amarillo: { text: "var(--risk-yellow)", bg: "var(--risk-yellow-bg)" },
  Verde:    { text: "var(--risk-green)",  bg: "var(--risk-green-bg)" },
};

const TIPO_COLORS: Record<string, string> = {
  Cobertura:  "#818cf8",
  Documental: "#f472b6",
  Proveedor:  "#fb923c",
  Dinámica:   "#ef4444",
  Vigencia:   "#a78bfa",
  Temporal:   "#38bdf8",
  NLP:        "#4ade80",
  Monto:      "#fbbf24",
  Frecuencia: "#34d399",
};

type EditFields = Pick<
  CatalogoRegla,
  | "nombre_regla" | "descripcion" | "clasificacion_base" | "severidad_base"
  | "puntos_nivel_1" | "puntos_nivel_2" | "umbral_1" | "umbral_2"
  | "unidad" | "condicion_descripcion" | "es_critica" | "activa"
>;

function EditModal({
  regla,
  onSave,
  onCancel,
}: {
  regla: CatalogoRegla;
  onSave: (fields: EditFields) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<EditFields>({
    nombre_regla:           regla.nombre_regla,
    descripcion:            regla.descripcion ?? "",
    clasificacion_base:     regla.clasificacion_base ?? "Amarillo",
    severidad_base:         regla.severidad_base ?? "",
    puntos_nivel_1:         regla.puntos_nivel_1,
    puntos_nivel_2:         regla.puntos_nivel_2,
    umbral_1:               regla.umbral_1,
    umbral_2:               regla.umbral_2,
    unidad:                 regla.unidad ?? "bool",
    condicion_descripcion:  regla.condicion_descripcion ?? "",
    es_critica:             regla.es_critica,
    activa:                 regla.activa,
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof EditFields, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--bg-base)",
    border: "1px solid var(--border)",
    borderRadius: 4,
    color: "var(--text-primary)",
    fontFamily: "var(--font-dm-mono)",
    fontSize: 12,
    padding: "6px 8px",
    width: "100%",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: "var(--text-secondary)",
    marginBottom: 4,
    display: "block",
    fontFamily: "var(--font-dm-mono)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflow: "auto",
          padding: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "var(--font-dm-mono)", fontSize: 11, color: "var(--text-tertiary)", marginBottom: 2 }}>
              {regla.codigo_regla}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
              Editar regla
            </div>
          </div>
          <button onClick={onCancel} style={{ color: "var(--text-tertiary)", lineHeight: 1 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Nombre</label>
            <input style={inputStyle} value={form.nombre_regla}
              onChange={(e) => set("nombre_regla", e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Descripción</label>
            <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }}
              value={form.descripcion ?? ""}
              onChange={(e) => set("descripcion", e.target.value)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Clasificación</label>
              <select style={inputStyle} value={form.clasificacion_base ?? "Amarillo"}
                onChange={(e) => set("clasificacion_base", e.target.value as CatalogoRegla["clasificacion_base"])}>
                <option value="Verde">Verde</option>
                <option value="Amarillo">Amarillo</option>
                <option value="Rojo">Rojo</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Severidad</label>
              <input style={inputStyle} value={form.severidad_base ?? ""}
                onChange={(e) => set("severidad_base", e.target.value)} />
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
              Puntuación graduada
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Umbral nivel 1</label>
                <input style={inputStyle} type="number" step="any"
                  value={form.umbral_1 ?? ""}
                  onChange={(e) => set("umbral_1", e.target.value === "" ? null : Number(e.target.value))} />
              </div>
              <div>
                <label style={labelStyle}>Puntos nivel 1</label>
                <input style={inputStyle} type="number"
                  value={form.puntos_nivel_1}
                  onChange={(e) => set("puntos_nivel_1", Number(e.target.value))} />
              </div>
              <div>
                <label style={labelStyle}>Umbral nivel 2</label>
                <input style={inputStyle} type="number" step="any"
                  value={form.umbral_2 ?? ""}
                  onChange={(e) => set("umbral_2", e.target.value === "" ? null : Number(e.target.value))} />
              </div>
              <div>
                <label style={labelStyle}>Puntos nivel 2</label>
                <input style={inputStyle} type="number"
                  value={form.puntos_nivel_2}
                  onChange={(e) => set("puntos_nivel_2", Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Unidad</label>
              <select style={inputStyle} value={form.unidad ?? "bool"}
                onChange={(e) => set("unidad", e.target.value)}>
                <option value="bool">bool (activa/no activa)</option>
                <option value="dias">días</option>
                <option value="horas">horas</option>
                <option value="siniestros">siniestros</option>
                <option value="ratio">ratio (0-1)</option>
                <option value="similitud">similitud (0-1)</option>
                <option value="count">count</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 18 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={form.es_critica}
                  onChange={(e) => set("es_critica", e.target.checked)} />
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Regla crítica</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={form.activa}
                  onChange={(e) => set("activa", e.target.checked)} />
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Activa</span>
              </label>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Descripción de condición</label>
            <input style={inputStyle} value={form.condicion_descripcion ?? ""}
              onChange={(e) => set("condicion_descripcion", e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "7px 16px", borderRadius: 5, fontSize: 12,
              border: "1px solid var(--border)", color: "var(--text-secondary)",
              background: "transparent", cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "7px 16px", borderRadius: 5, fontSize: 12,
              background: "var(--accent)", color: "#fff",
              border: "none", cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <Save size={13} />
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReglasCatalogTable({ reglas, onUpdate }: Props) {
  const [editing, setEditing] = useState<CatalogoRegla | null>(null);
  const [sortField, setSortField] = useState<"codigo_regla" | "puntos_nivel_1" | "tipo_regla">("codigo_regla");
  const [sortAsc, setSortAsc] = useState(true);
  const [filterActiva, setFilterActiva] = useState<"all" | "activa" | "inactiva">("all");
  const [saveError, setSaveError] = useState<string | null>(null);

  const sorted = [...reglas]
    .filter((r) => {
      if (filterActiva === "activa") return r.activa;
      if (filterActiva === "inactiva") return !r.activa;
      return true;
    })
    .sort((a, b) => {
      const va = a[sortField] ?? "";
      const vb = b[sortField] ?? "";
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortAsc((v) => !v);
    else { setSortField(field); setSortAsc(true); }
  }

  async function handleSave(fields: EditFields) {
    if (!editing) return;
    setSaveError(null);
    const { error } = await supabase
      .from("catalogo_regla")
      .update(fields)
      .eq("codigo_regla", editing.codigo_regla);
    if (error) {
      setSaveError(error.message);
      return;
    }
    onUpdate({ ...editing, ...fields });
    setEditing(null);
  }

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field ? (
      sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />
    ) : null;

  const thStyle: React.CSSProperties = {
    padding: "8px 12px",
    fontFamily: "var(--font-dm-mono)",
    fontSize: 10,
    color: "var(--text-tertiary)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    textAlign: "left",
    borderBottom: "1px solid var(--border)",
    whiteSpace: "nowrap",
  };

  return (
    <>
      {editing && (
        <EditModal
          regla={editing}
          onSave={handleSave}
          onCancel={() => { setEditing(null); setSaveError(null); }}
        />
      )}

      {saveError && (
        <div style={{
          background: "var(--risk-red-bg)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 6, padding: "10px 14px", marginBottom: 12,
          fontSize: 12, color: "var(--risk-red)", fontFamily: "var(--font-dm-mono)",
        }}>
          Error al guardar: {saveError}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        {(["all", "activa", "inactiva"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setFilterActiva(v)}
            style={{
              padding: "4px 12px", borderRadius: 4, fontSize: 11,
              fontFamily: "var(--font-dm-mono)", cursor: "pointer",
              border: "1px solid var(--border)",
              background: filterActiva === v ? "var(--accent)" : "transparent",
              color: filterActiva === v ? "#fff" : "var(--text-secondary)",
            }}
          >
            {v === "all" ? "Todas" : v === "activa" ? "Activas" : "Inactivas"}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-dm-mono)" }}>
          {sorted.length} reglas
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => toggleSort("codigo_regla")}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  Código <SortIcon field="codigo_regla" />
                </span>
              </th>
              <th style={thStyle}>Nombre</th>
              <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => toggleSort("tipo_regla")}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  Tipo <SortIcon field="tipo_regla" />
                </span>
              </th>
              <th style={thStyle}>Clasificación</th>
              <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => toggleSort("puntos_nivel_1")}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  Pts N1 <SortIcon field="puntos_nivel_1" />
                </span>
              </th>
              <th style={thStyle}>Umbral 1</th>
              <th style={thStyle}>Pts N2</th>
              <th style={thStyle}>Umbral 2</th>
              <th style={thStyle}>Unidad</th>
              <th style={thStyle}>Estado</th>
              <th style={thStyle} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const cls = CLASIFICACION_COLORS[r.clasificacion_base ?? "Amarillo"] ?? CLASIFICACION_COLORS.Amarillo;
              const tipoColor = TIPO_COLORS[r.tipo_regla ?? ""] ?? "var(--text-tertiary)";
              return (
                <tr
                  key={r.codigo_regla}
                  style={{ borderBottom: "1px solid var(--border)", opacity: r.activa ? 1 : 0.45 }}
                  className="row-hover"
                >
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{
                      fontFamily: "var(--font-dm-mono)", fontSize: 11, fontWeight: 600,
                      color: cls.text, background: cls.bg,
                      padding: "2px 7px", borderRadius: 4,
                    }}>
                      {r.codigo_regla}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-primary)", maxWidth: 240 }}>
                    <div style={{ fontWeight: 500 }}>{r.nombre_regla}</div>
                    {r.condicion_descripcion && (
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2, fontFamily: "var(--font-dm-mono)" }}>
                        {r.condicion_descripcion}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{
                      fontSize: 10, fontFamily: "var(--font-dm-mono)",
                      color: tipoColor, background: `${tipoColor}18`,
                      padding: "2px 7px", borderRadius: 4,
                    }}>
                      {r.tipo_regla ?? "—"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontSize: 12, color: cls.text, fontFamily: "var(--font-dm-mono)" }}>
                      {r.clasificacion_base ?? "—"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", fontFamily: "var(--font-dm-mono)", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    {r.puntos_nivel_1}
                  </td>
                  <td style={{ padding: "10px 12px", fontFamily: "var(--font-dm-mono)", fontSize: 12, color: "var(--text-secondary)" }}>
                    {r.umbral_1 ?? "—"}
                  </td>
                  <td style={{ padding: "10px 12px", fontFamily: "var(--font-dm-mono)", fontSize: 12, color: "var(--text-secondary)" }}>
                    {r.puntos_nivel_2 > 0 ? r.puntos_nivel_2 : "—"}
                  </td>
                  <td style={{ padding: "10px 12px", fontFamily: "var(--font-dm-mono)", fontSize: 12, color: "var(--text-secondary)" }}>
                    {r.umbral_2 ?? "—"}
                  </td>
                  <td style={{ padding: "10px 12px", fontFamily: "var(--font-dm-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>
                    {r.unidad ?? "bool"}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{
                      fontSize: 10, fontFamily: "var(--font-dm-mono)",
                      color: r.activa ? "var(--risk-green)" : "var(--text-tertiary)",
                      background: r.activa ? "var(--risk-green-bg)" : "transparent",
                      padding: "2px 7px", borderRadius: 4,
                      border: r.activa ? "1px solid rgba(34,197,94,0.2)" : "1px solid var(--border)",
                    }}>
                      {r.activa ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <button
                      onClick={() => setEditing(r)}
                      style={{
                        color: "var(--text-tertiary)", padding: 4, borderRadius: 4,
                        background: "transparent", border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center",
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
