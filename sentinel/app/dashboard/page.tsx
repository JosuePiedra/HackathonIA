"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useData } from "@/context/DataContext";
import { getTopProviders, getCasesByRamo, getScoreHistogramData } from "@/lib/claimsUtils";
import { KPICard } from "@/components/dashboard/KPICard";
import { RiskDistributionChart } from "@/components/dashboard/RiskDistributionChart";
import { TopProvidersChart } from "@/components/dashboard/TopProvidersChart";
import { CasesByRamoChart } from "@/components/dashboard/CasesByRamoChart";
import { ScoreHistogram } from "@/components/dashboard/ScoreHistogram";
import { LoadingState } from "@/components/shared/LoadingState";

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const pct = (part: number, total: number) =>
  total > 0 ? `${Math.round((part / total) * 100)}% del total` : "—";

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="chart-card card" style={{ flex: 1, minWidth: 280 }}>
      <h4 style={{ fontFamily: "var(--font-syne)", fontSize: 14, fontWeight: 600 }}>{title}</h4>
      <div
        style={{
          fontFamily: "var(--font-dm-mono)",
          fontSize: 11,
          color: "var(--text-tertiary)",
          marginBottom: 8,
        }}
      >
        {subtitle}
      </div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { claims, stats, isLoading, connected, error } = useData();

  const topProv = useMemo(() => getTopProviders(claims, 8), [claims]);
  const ramoData = useMemo(() => getCasesByRamo(claims), [claims]);
  const histogram = useMemo(() => getScoreHistogramData(claims), [claims]);

  if (isLoading || (!connected && !error)) {
    return <LoadingState cards={8} />;
  }

  if (!connected || claims.length === 0) {
    return (
      <div className="page">
        <div
          className="card"
          style={{ textAlign: "center", padding: 48, color: "var(--text-secondary)" }}
        >
          <h3 style={{ fontFamily: "var(--font-syne)", fontSize: 18, marginBottom: 8 }}>
            {error ? "No se pudieron cargar los datos" : "No hay siniestros scoreados"}
          </h3>
          <p style={{ fontSize: 13, marginBottom: 16 }}>
            {error
              ? error
              : connected
                ? "Cargá siniestros y dejá que el backend los puntúe para verlos aquí."
                : "Conectá Supabase desde la pantalla de inicio."}
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Link href="/siniestros" className="btn btn-primary">
              Gestionar siniestros
            </Link>
            <Link href="/" className="btn btn-ghost">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="kpi-grid">
        <KPICard title="Total siniestros" value={stats.total} subtitle="Periodo activo" />
        <KPICard title="Casos rojos" value={stats.rojo} subtitle={pct(stats.rojo, stats.total)} variant="red" />
        <KPICard title="Casos amarillos" value={stats.amarillo} subtitle={pct(stats.amarillo, stats.total)} variant="yellow" />
        <KPICard title="Casos verdes" value={stats.verde} subtitle={pct(stats.verde, stats.total)} variant="green" />
        <KPICard title="Score heurístico prom." value={stats.score_heuristico_promedio} subtitle="Escala 0–100" />
        <KPICard title="Monto reclamado" value={money(stats.monto_total)} subtitle="Total acumulado" />
        <KPICard title="Monto en rojos" value={money(stats.monto_rojo)} subtitle={pct(stats.monto_rojo, stats.monto_total)} variant="red" />
        <KPICard title="Ahorro potencial" value={money(stats.ahorro_potencial)} subtitle="Exposición en rojos" variant="green" />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "16px 0" }}>
        <ChartCard title="Distribución de riesgo" subtitle="Casos por nivel">
          <RiskDistributionChart rojo={stats.rojo} amarillo={stats.amarillo} verde={stats.verde} />
        </ChartCard>
        <ChartCard title="Top proveedores" subtitle="Por número de casos · rojo = lista restrictiva">
          <TopProvidersChart data={topProv} />
        </ChartCard>
        <ChartCard title="Casos por ramo" subtitle="Apilado por nivel de riesgo">
          <CasesByRamoChart data={ramoData} />
        </ChartCard>
      </div>

      <div className="chart-card card">
        <h4 style={{ fontFamily: "var(--font-syne)", fontSize: 14, fontWeight: 600 }}>
          Distribución del score final
        </h4>
        <div
          style={{
            fontFamily: "var(--font-dm-mono)",
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginBottom: 8,
          }}
        >
          Buckets de 10 puntos · coloreado por zona de riesgo
        </div>
        <ScoreHistogram data={histogram} />
      </div>
    </div>
  );
}
