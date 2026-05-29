import { RiskBadge } from "@/components/shared/RiskBadge";
import type { ProveedorStats } from "@/lib/types";

const money = (n: number) => n.toLocaleString("en-US");

function pctColor(pct: number) {
  return pct >= 50 ? "var(--risk-red)" : pct >= 25 ? "var(--risk-yellow)" : "var(--risk-green)";
}

interface Props {
  data: ProveedorStats[];
  onSelect: (p: ProveedorStats) => void;
}

export function ProveedoresTable({ data, onSelect }: Props) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>#</th>
          <th>ID Proveedor</th>
          <th>Casos</th>
          <th>Rojos</th>
          <th>% Alertas</th>
          <th>Monto prom.</th>
          <th>Lista restrictiva</th>
          <th>Nivel</th>
        </tr>
      </thead>
      <tbody>
        {data.map((p, i) => (
          <tr
            key={p.id_proveedor}
            className={`row-hover ${p.en_lista_restrictiva ? "restrictiva" : ""}`}
            onClick={() => onSelect(p)}
          >
            <td className="col-mono">#{i + 1}</td>
            <td className="col-id">{p.id_proveedor}</td>
            <td className="col-mono" style={{ color: "var(--text-primary)" }}>{p.casos_totales}</td>
            <td>
              <span style={{ color: p.casos_rojos > 0 ? "var(--risk-red)" : "var(--text-tertiary)", fontFamily: "var(--font-dm-mono)" }}>
                {p.casos_rojos}
              </span>
            </td>
            <td style={{ minWidth: 160 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, p.pct_alertas)}%`, background: pctColor(p.pct_alertas), borderRadius: 3 }} />
                </div>
                <span style={{ fontFamily: "var(--font-dm-mono)", fontSize: 12, minWidth: 36, textAlign: "right" }}>
                  {Math.round(p.pct_alertas)}%
                </span>
              </div>
            </td>
            <td className="col-money">
              <span className="dollar">$</span>
              {money(Math.round(p.monto_promedio))}
            </td>
            <td>
              {p.en_lista_restrictiva ? (
                <span
                  style={{
                    fontFamily: "var(--font-dm-mono)",
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    padding: "2px 8px",
                    borderRadius: 4,
                    color: "var(--risk-red)",
                    background: "var(--risk-red-bg)",
                    border: "1px solid rgba(239,68,68,0.3)",
                  }}
                >
                  Restringido
                </span>
              ) : (
                <span style={{ color: "var(--text-tertiary)" }}>—</span>
              )}
            </td>
            <td>
              <RiskBadge level={p.nivel_riesgo} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
