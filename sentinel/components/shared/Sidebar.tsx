"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LayoutDashboard,
  ListFilter,
  Database,
  Share2,
  Building2,
  Bot,
  ShieldCheck,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { APP_VERSION } from "@/lib/constants";

const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: Home, match: (p: string) => p === "/" },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: (p: string) => p.startsWith("/dashboard") },
  { href: "/casos", label: "Bandeja de casos", icon: ListFilter, match: (p: string) => p.startsWith("/casos"), badge: true },
  { href: "/siniestros", label: "Siniestros", icon: Database, match: (p: string) => p.startsWith("/siniestros") },
  { href: "/red", label: "Red de relaciones", icon: Share2, match: (p: string) => p.startsWith("/red") },
  { href: "/proveedores", label: "Proveedores", icon: Building2, match: (p: string) => p.startsWith("/proveedores") },
  { href: "/agente", label: "Agente IA", icon: Bot, match: (p: string) => p.startsWith("/agente"), live: true },
  { href: "/reglas", label: "Reglas de negocio", icon: ShieldCheck, match: (p: string) => p.startsWith("/reglas") },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { stats, claims, connected, supabaseConfigured } = useData();

  const sourceLabel = connected
    ? "Base de datos"
    : supabaseConfigured
      ? "Sin conexión"
      : "No configurado";
  const sourceColor = connected
    ? "var(--risk-green)"
    : supabaseConfigured
      ? "var(--risk-red)"
      : "var(--text-tertiary)";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">SENTINEL</div>
      <div className="sidebar-subtitle">Unidad Antifraude</div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${active ? "active" : ""}`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              {"badge" in item && item.badge && stats.rojo > 0 ? (
                <span className="badge-count">{stats.rojo}</span>
              ) : null}
              {"live" in item && item.live ? <span className="live-dot" /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="filename" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: sourceColor,
              flexShrink: 0,
            }}
          />
          {sourceLabel}
        </div>
        <div className="records">
          {claims.length.toLocaleString("es-EC")} siniestros
        </div>
        <div className="records" style={{ marginTop: 6, opacity: 0.7 }}>
          {APP_VERSION}
        </div>
      </div>
    </aside>
  );
}
