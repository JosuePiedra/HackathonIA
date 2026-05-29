"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useData } from "@/context/DataContext";
import { getTopProviders } from "@/lib/claimsUtils";
import { ProveedoresTable } from "@/components/proveedores/ProveedoresTable";
import { ProveedorDetailPanel } from "@/components/proveedores/ProveedorDetailPanel";
import { SavingsSimulator } from "@/components/proveedores/SavingsSimulator";
import { LoadingState } from "@/components/shared/LoadingState";
import type { ProveedorStats } from "@/lib/types";

export default function ProveedoresPage() {
  const { claims, connected, isLoading, error } = useData();
  const [selected, setSelected] = useState<ProveedorStats | null>(null);

  const ranking = useMemo(
    () =>
      getTopProviders(claims, 100).sort(
        (a, b) => b.pct_alertas - a.pct_alertas || b.casos_rojos - a.casos_rojos,
      ),
    [claims],
  );

  if (isLoading || (!connected && !error)) {
    return <LoadingState cards={3} />;
  }

  if (!connected || claims.length === 0) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--text-secondary)" }}>
          <h3 style={{ fontFamily: "var(--font-syne)", fontSize: 18, marginBottom: 8 }}>
            Sin proveedores para mostrar
          </h3>
          <p style={{ fontSize: 13, marginBottom: 16 }}>
            {connected ? "No hay siniestros scoreados todavía." : "Conectá Supabase desde el inicio."}
          </p>
          <Link href="/siniestros" className="btn btn-primary">
            Gestionar siniestros
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h2 style={{ fontFamily: "var(--font-syne)", fontSize: 22, fontWeight: 600 }}>
        Ranking de proveedores
      </h2>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 2, marginBottom: 16 }}>
        Ordenado por % de alertas descendente · click para ver detalle
      </p>

      <div className="card" style={{ padding: 0, overflow: "auto", maxHeight: "calc(100vh - 420px)", minHeight: 300 }}>
        <ProveedoresTable data={ranking} onSelect={setSelected} />
      </div>

      <SavingsSimulator claims={claims} />

      {selected ? (
        <ProveedorDetailPanel proveedor={selected} claims={claims} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}
