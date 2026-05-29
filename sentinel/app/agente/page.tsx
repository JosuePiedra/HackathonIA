"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useData } from "@/context/DataContext";
import { SuggestedQuestions } from "@/components/agente/SuggestedQuestions";
import { ChatInterface } from "@/components/agente/ChatInterface";

function AgenteContent() {
  const searchParams = useSearchParams();
  const siniestro = searchParams.get("siniestro");
  const { stats, claims } = useData();

  const [external, setExternal] = useState<{ question: string; nonce: number } | null>(
    () =>
      siniestro
        ? {
            question: `¿Por qué el siniestro ${siniestro} fue marcado como alto riesgo?`,
            nonce: 0,
          }
        : null,
  );

  const ask = (q: string) =>
    setExternal((prev) => ({ question: q, nonce: (prev?.nonce ?? 0) + 1 }));

  const [prefill, setPrefill] = useState<{ text: string; nonce: number } | null>(null);
  const prefillInput = (text: string) =>
    setPrefill((prev) => ({ text, nonce: (prev?.nonce ?? 0) + 1 }));

  return (
    <div className="agente-layout">
      <aside className="agente-side">
        <SuggestedQuestions onSelect={ask} onPrefill={prefillInput} />

        <div className="context-block" style={{ marginTop: 22 }}>
          <div style={{ marginBottom: 6, color: "var(--text-secondary)" }}>Contexto activo</div>
          <div className="ctx-row">
            <span>siniestros</span>
            <span className="v">{claims.length}</span>
          </div>
          <div className="ctx-row">
            <span>rojos</span>
            <span className="v" style={{ color: "var(--risk-red)" }}>
              {stats.rojo}
            </span>
          </div>
          <div className="ctx-row">
            <span>score heurístico prom.</span>
            <span className="v">{stats.score_heuristico_promedio}</span>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            fontFamily: "var(--font-dm-mono)",
            fontSize: 11,
            color: "var(--text-tertiary)",
            lineHeight: 1.5,
          }}
        >
          El agente consulta Supabase con SQL. No regenera explicaciones ya persistidas.
        </div>
      </aside>

      <ChatInterface external={external} prefill={prefill} />
    </div>
  );
}

export default function AgentePage() {
  return (
    <Suspense fallback={<div className="page">Cargando…</div>}>
      <AgenteContent />
    </Suspense>
  );
}
