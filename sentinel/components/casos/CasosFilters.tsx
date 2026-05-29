"use client";

import { useMemo } from "react";
import type { SiniestroCompleto, FilterState, RiskLevel } from "@/lib/types";

const ALL_LEVELS: RiskLevel[] = ["VERDE", "AMARILLO", "ROJO"];
const LEVEL_META: Record<RiskLevel, { cls: string; label: string }> = {
  VERDE: { cls: "green", label: "Verde" },
  AMARILLO: { cls: "yellow", label: "Amarillo" },
  ROJO: { cls: "red", label: "Rojo" },
};

interface Props {
  claims: SiniestroCompleto[];
  filters: FilterState;
  onChange: (next: FilterState) => void;
}

export function CasosFilters({ claims, filters, onChange }: Props) {
  const ramos = useMemo(
    () => [...new Set(claims.map((c) => c.ramo).filter(Boolean))].sort(),
    [claims],
  );
  const ciudades = useMemo(
    () => [...new Set(claims.map((c) => c.ciudad).filter(Boolean))].sort(),
    [claims],
  );

  const patch = (p: Partial<FilterState>) => onChange({ ...filters, ...p });

  const levelActive = (l: RiskLevel) =>
    filters.nivel_riesgo.length === 0 || filters.nivel_riesgo.includes(l);

  const toggleNivel = (l: RiskLevel) => {
    const cur = filters.nivel_riesgo;
    if (cur.length === 0) patch({ nivel_riesgo: ALL_LEVELS.filter((x) => x !== l) });
    else if (cur.includes(l)) patch({ nivel_riesgo: cur.filter((x) => x !== l) });
    else patch({ nivel_riesgo: [...cur, l] });
  };

  const toggleArray = (key: "ramos" | "ciudades", value: string) => {
    const cur = filters[key];
    patch({
      [key]: cur.includes(value)
        ? cur.filter((x) => x !== value)
        : [...cur, value],
    } as Partial<FilterState>);
  };

  return (
    <div className="filters">
      <div className="filters-header">
        <h3>Filtros</h3>
      </div>

      <div className="filter-group">
        <div className="filter-group-label">Nivel de riesgo</div>
        <div className="pills">
          {ALL_LEVELS.map((l) => (
            <button
              key={l}
              className={`pill ${LEVEL_META[l].cls} ${levelActive(l) ? "active" : ""}`}
              onClick={() => toggleNivel(l)}
            >
              <span className="dot" />
              {LEVEL_META[l].label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <div className="filter-group-label">Ramo</div>
        <div className="checks">
          {ramos.map((r) => (
            <div
              key={r}
              className={`check ${filters.ramos.includes(r) ? "checked" : ""}`}
              onClick={() => toggleArray("ramos", r)}
            >
              <span className="box" />
              {r}
            </div>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <div className="filter-group-label">Ciudad</div>
        <div className="checks">
          {ciudades.map((c) => (
            <div
              key={c}
              className={`check ${filters.ciudades.includes(c) ? "checked" : ""}`}
              onClick={() => toggleArray("ciudades", c)}
            >
              <span className="box" />
              {c}
            </div>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <div className="filter-group-label">Proveedor</div>
        <input
          className="text-input"
          placeholder="PROV-..."
          value={filters.proveedor}
          onChange={(e) => patch({ proveedor: e.target.value })}
        />
      </div>

      <div className="filter-group">
        <div className="filter-group-label">
          Score final: {filters.score_min} – {filters.score_max}
        </div>
        <div className="range-slider">
          <input
            type="range"
            min={0}
            max={100}
            value={filters.score_min}
            className="range-input"
            onChange={(e) =>
              patch({ score_min: Math.min(Number(e.target.value), filters.score_max) })
            }
          />
          <input
            type="range"
            min={0}
            max={100}
            value={filters.score_max}
            className="range-input"
            onChange={(e) =>
              patch({ score_max: Math.max(Number(e.target.value), filters.score_min) })
            }
          />
        </div>
      </div>

      <div className="filter-group">
        <div className="filter-group-label">Alertas</div>
        <div className="toggles">
          <div
            className={`toggle ${filters.con_reglas_criticas ? "active" : ""}`}
            onClick={() => patch({ con_reglas_criticas: !filters.con_reglas_criticas })}
          >
            <span>Con reglas críticas</span>
            <span className="switch" />
          </div>
          <div
            className={`toggle ${filters.documentos_incompletos ? "active" : ""}`}
            onClick={() =>
              patch({ documentos_incompletos: !filters.documentos_incompletos })
            }
          >
            <span>Documentos incompletos</span>
            <span className="switch" />
          </div>
        </div>
      </div>
    </div>
  );
}
