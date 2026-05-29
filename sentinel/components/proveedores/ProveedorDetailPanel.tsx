import Link from "next/link";
import { X } from "lucide-react";
import { RiskBadge } from "@/components/shared/RiskBadge";
import type { ProveedorStats, SiniestroCompleto } from "@/lib/types";

const money = (n: number) => "$" + n.toLocaleString("en-US");

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ fontFamily: "var(--font-dm-mono)", fontSize: 10, textTransform: "uppercase", color: "var(--text-tertiary)" }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-syne)", fontSize: 20, fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
  );
}

interface Props {
  proveedor: ProveedorStats;
  claims: SiniestroCompleto[];
  onClose: () => void;
}

export function ProveedorDetailPanel({ proveedor, claims, onClose }: Props) {
  const casos = claims.filter((c) => c.id_proveedor === proveedor.id_proveedor);
  const dist = {
    rojo: casos.filter((c) => c.nivel_riesgo === "ROJO").length,
    amarillo: casos.filter((c) => c.nivel_riesgo === "AMARILLO").length,
    verde: casos.filter((c) => c.nivel_riesgo === "VERDE").length,
  };
  const total = casos.length || 1;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          height: "100%",
          width: 440,
          maxWidth: "90vw",
          background: "var(--bg-surface)",
          borderLeft: "1px solid var(--border)",
          padding: 24,
          overflow: "auto",
          animation: "slideInRight 0.25s ease",
        }}
      >
        <button onClick={onClose} style={{ position: "absolute", top: 18, right: 18 }} aria-label="Cerrar">
          <X size={18} style={{ color: "var(--text-secondary)" }} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <h3 style={{ fontFamily: "var(--font-syne)", fontSize: 20, fontWeight: 700 }}>{proveedor.id_proveedor}</h3>
          {proveedor.en_lista_restrictiva ? (
            <span
              style={{
                fontFamily: "var(--font-dm-mono)",
                fontSize: 10,
                textTransform: "uppercase",
                padding: "2px 8px",
                borderRadius: 4,
                color: "var(--risk-red)",
                background: "var(--risk-red-bg)",
                border: "1px solid rgba(239,68,68,0.3)",
              }}
            >
              Restringido
            </span>
          ) : null}
        </div>
        <div style={{ marginBottom: 20 }}>
          <RiskBadge level={proveedor.nivel_riesgo} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Metric label="Casos totales" value={proveedor.casos_totales} />
          <Metric label="Casos rojos" value={proveedor.casos_rojos} />
          <Metric label="Monto promedio" value={money(Math.round(proveedor.monto_promedio))} />
          <Metric label="Monto total" value={money(Math.round(proveedor.monto_total))} />
        </div>

        <h4 className="label-mono" style={{ marginTop: 24, marginBottom: 10 }}>
          Distribución de riesgo
        </h4>
        <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", background: "var(--border)" }}>
          <div style={{ width: `${(dist.rojo / total) * 100}%`, background: "var(--risk-red)" }} />
          <div style={{ width: `${(dist.amarillo / total) * 100}%`, background: "var(--risk-yellow)" }} />
          <div style={{ width: `${(dist.verde / total) * 100}%`, background: "var(--risk-green)" }} />
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 8, fontFamily: "var(--font-dm-mono)", fontSize: 11, color: "var(--text-secondary)" }}>
          <span>Rojos {dist.rojo}</span>
          <span>Amarillos {dist.amarillo}</span>
          <span>Verdes {dist.verde}</span>
        </div>

        <h4 className="label-mono" style={{ marginTop: 24, marginBottom: 10 }}>
          Siniestros asociados
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {casos.slice(0, 8).map((c) => (
            <Link
              key={c.id_siniestro}
              href={`/casos/${c.id_siniestro}`}
              className="row-hover"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid var(--border)",
              }}
            >
              <span className="col-id" style={{ fontFamily: "var(--font-dm-mono)", color: "var(--accent)", fontSize: 12 }}>
                {c.id_siniestro}
              </span>
              <RiskBadge level={c.nivel_riesgo} />
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-dm-mono)", fontSize: 11, color: "var(--text-secondary)" }}>
                {money(c.monto_reclamado)}
              </span>
            </Link>
          ))}
          {casos.length === 0 ? (
            <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>Sin siniestros asociados.</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
