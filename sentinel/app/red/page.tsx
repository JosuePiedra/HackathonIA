"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useData } from "@/context/DataContext";
import { buildGraphData } from "@/lib/claimsUtils";
import { LoadingState } from "@/components/shared/LoadingState";
import type { GraphNode } from "@/lib/types";

const RelationGraph = dynamic(
  () => import("@/components/red/RelationGraph").then((m) => m.RelationGraph),
  { ssr: false, loading: () => <div className="page">Cargando red…</div> },
);

export default function RedPage() {
  const { claims, connected, isLoading, error } = useData();
  const router = useRouter();

  const data = useMemo(() => buildGraphData(claims), [claims]);

  const onNodeClick = (node: GraphNode) => {
    if (node.type === "siniestro") router.push(`/casos/${node.id}`);
    else if (node.type === "proveedor") router.push("/proveedores");
    else router.push(`/casos?q=${encodeURIComponent(node.id)}`);
  };

  if (isLoading || (!connected && !error)) {
    return <LoadingState cards={3} />;
  }

  if (!connected || claims.length === 0) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--text-secondary)" }}>
          <h3 style={{ fontFamily: "var(--font-syne)", fontSize: 18, marginBottom: 8 }}>
            Sin red para mostrar
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

  return <RelationGraph data={data} onNodeClick={onNodeClick} />;
}
