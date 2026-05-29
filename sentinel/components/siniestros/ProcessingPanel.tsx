"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, Loader2, X, Cpu } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { RiskLevel } from "@/lib/types";

interface ScoreRow {
  id_siniestro: string;
  score_final: number | null;
  nivel_riesgo: RiskLevel | null;
  prediccion_ml: number | null;
}

interface Props {
  ids: string[];
  onDone: () => void;
}

const NIVEL_COLOR: Record<string, string> = {
  Rojo: "var(--risk-red)",
  Amarillo: "var(--risk-yellow)",
  Verde: "var(--risk-green)",
};

const NIVEL_BG: Record<string, string> = {
  Rojo: "var(--risk-red-bg)",
  Amarillo: "var(--risk-yellow-bg)",
  Verde: "var(--risk-green-bg)",
};

export function ProcessingPanel({ ids, onDone }: Props) {
  const [scores, setScores] = useState<Record<string, ScoreRow>>({});
  const [dismissed, setDismissed] = useState(false);
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (ids.length === 0) return;

    const poll = async () => {
      const { data } = await supabase
        .from("score_siniestro")
        .select("id_siniestro, score_final, nivel_riesgo, prediccion_ml")
        .in("id_siniestro", ids);
      if (data) {
        const map: Record<string, ScoreRow> = {};
        for (const row of data) map[row.id_siniestro] = row as ScoreRow;
        setScores(map);
      }
    };

    void poll();
    const interval = setInterval(() => void poll(), 3000);
    return () => clearInterval(interval);
  }, [ids]);

  const processedCount = ids.filter((id) => scores[id]?.score_final != null).length;
  const allDone = ids.length > 0 && processedCount === ids.length;

  useEffect(() => {
    if (allDone && !doneTimerRef.current) {
      doneTimerRef.current = setTimeout(() => {
        setDismissed(true);
        onDone();
      }, 4000);
    }
    return () => {
      if (doneTimerRef.current) {
        clearTimeout(doneTimerRef.current);
        doneTimerRef.current = null;
      }
    };
  }, [allDone, onDone]);

  if (dismissed || ids.length === 0) return null;

  const pct = ids.length > 0 ? (processedCount / ids.length) * 100 : 0;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 360,
        maxHeight: 480,
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderLeft: allDone ? "3px solid var(--risk-green)" : "3px solid var(--accent)",
        borderRadius: 10,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        animation: "fadeInUp 0.3s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Cpu size={14} style={{ color: "var(--accent)" }} />
          <span
            style={{
              fontFamily: "var(--font-syne)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {allDone ? "Procesamiento completado" : "Procesando siniestros…"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--font-dm-mono)",
              color: "var(--text-tertiary)",
            }}
          >
            {processedCount}/{ids.length}
          </span>
          <button
            onClick={() => { setDismissed(true); onDone(); }}
            aria-label="Cerrar"
            style={{ color: "var(--text-secondary)", lineHeight: 1 }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "var(--bg-elevated)", flexShrink: 0 }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: allDone ? "var(--risk-green)" : "var(--accent)",
            transition: "width 0.5s ease",
          }}
        />
      </div>

      {/* List */}
      <div style={{ overflowY: "auto", flexGrow: 1, padding: "6px 0" }}>
        {ids.map((id) => {
          const score = scores[id];
          const done = score?.score_final != null;
          const nivel = score?.nivel_riesgo ?? null;

          return (
            <div
              key={id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "5px 14px",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                {done ? (
                  <CheckCircle size={13} style={{ color: "var(--risk-green)", flexShrink: 0 }} />
                ) : (
                  <Loader2
                    size={13}
                    style={{
                      color: "var(--accent)",
                      flexShrink: 0,
                      animation: "spin 1s linear infinite",
                    }}
                  />
                )}
                <span
                  style={{
                    fontFamily: "var(--font-dm-mono)",
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {id}
                </span>
              </div>

              {done && nivel ? (
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "var(--font-dm-mono)",
                    fontWeight: 600,
                    color: NIVEL_COLOR[nivel] ?? "var(--text-tertiary)",
                    flexShrink: 0,
                    padding: "2px 6px",
                    background: NIVEL_BG[nivel] ?? "var(--bg-elevated)",
                    borderRadius: 4,
                    border: `1px solid ${NIVEL_COLOR[nivel] ?? "var(--border)"}`,
                  }}
                >
                  {nivel} · {score.score_final?.toFixed(0)}
                </span>
              ) : done ? (
                <span style={{ fontSize: 10, fontFamily: "var(--font-dm-mono)", color: "var(--text-tertiary)", flexShrink: 0 }}>
                  sin score
                </span>
              ) : (
                <span style={{ fontSize: 10, fontFamily: "var(--font-dm-mono)", color: "var(--text-tertiary)", flexShrink: 0 }}>
                  analizando…
                </span>
              )}
            </div>
          );
        })}
      </div>

      {allDone && (
        <div
          style={{
            padding: "8px 14px",
            borderTop: "1px solid var(--border)",
            fontSize: 11,
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-dm-mono)",
            flexShrink: 0,
          }}
        >
          Se cierra automáticamente en unos segundos…
        </div>
      )}
    </div>
  );
}
