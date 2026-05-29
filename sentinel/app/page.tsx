"use client";

import Link from "next/link";
import { Shield, LayoutDashboard, FolderPlus, RefreshCw } from "lucide-react";
import { useData } from "@/context/DataContext";
import { APP_VERSION } from "@/lib/constants";
import { ParticleField } from "@/components/inicio/ParticleField";

export default function InicioPage() {
  const { claims, isLoading, error, connected, supabaseConfigured, refresh } =
    useData();

  const statusColor = connected
    ? "var(--risk-green)"
    : supabaseConfigured
      ? "var(--risk-red)"
      : "var(--text-tertiary)";
  const statusText = isLoading
    ? "Conectando a la base de datos…"
    : connected
      ? `Conectado a la base de datos · ${claims.length.toLocaleString("es-EC")} siniestros`
      : supabaseConfigured
        ? "No se pudo conectar a la base de datos"
        : "Base de datos no configurada";

  return (
    <div className="inicio-screen" style={{ position: "relative", overflow: "hidden" }}>
      <ParticleField />
      <div className="inicio-content" style={{ position: "relative", zIndex: 1 }}>
        
        <h1 className="inicio-heading">SENTINEL</h1>
        <p className="inicio-sub">Detector de posibles fraudes en siniestros</p>
        <div className="inicio-divider" />

        <div className="ethics-box">
          <Shield style={{ width: 20, height: 20, flexShrink: 0 }} />
          <p>
            Este sistema genera alertas de posible riesgo para apoyar la revisión
            humana de siniestros. No acusa automáticamente a ningún cliente,
            proveedor o beneficiario, ni toma decisiones de pago o rechazo.
          </p>
        </div>

        {/* Estado de conexión */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontFamily: "var(--font-dm-mono)",
            fontSize: 12,
            color: "var(--text-secondary)",
            marginBottom: 4,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor }} />
          {statusText}
        </div>

        <div className="inicio-actions">
          <Link
            href="/dashboard"
            className="btn btn-primary btn-large"
            aria-disabled={!connected}
            style={connected ? undefined : { opacity: 0.5, pointerEvents: "none" }}
          >
            <LayoutDashboard size={16} /> Entrar al dashboard
          </Link>
          <Link href="/siniestros" className="btn btn-ghost btn-large">
            <FolderPlus size={16} /> Gestionar siniestros
          </Link>
        </div>

        {!connected && !isLoading ? (
          <div className="validation-error">
            <h4>
              {supabaseConfigured
                ? "No se pudo conectar a la base de datos"
                : "Base de datos no configurada"}
            </h4>
            <div
              style={{
                fontFamily: "var(--font-dm-mono)",
                fontSize: 11,
                color: "var(--text-secondary)",
                marginBottom: 8,
              }}
            >
              {error ??
                "Definí NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local y reiniciá el servidor."}
            </div>
            <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => void refresh()}>
              <RefreshCw size={12} /> Reintentar conexión
            </button>
          </div>
        ) : null}

        <div
          style={{
            marginTop: 14,
            fontFamily: "var(--font-dm-mono)",
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          <div className="flex items-center justify-center w-full">
  {APP_VERSION}
</div>
        </div>
      </div>
    </div>
  );
}
