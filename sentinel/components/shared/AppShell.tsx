"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // La pantalla de inicio es full screen, sin sidebar.
  if (pathname === "/") {
    return <div className="app-shell no-sidebar">{children}</div>;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Topbar />
        {children}
      </div>
    </div>
  );
}
