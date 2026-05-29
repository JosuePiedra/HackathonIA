import type { Metadata } from "next";
import { Syne, DM_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import { DataProvider } from "@/context/DataContext";
import { AppShell } from "@/components/shared/AppShell";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "500", "600", "700", "800"],
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-dm-mono",
  weight: ["300", "400", "500"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "SENTINEL — Unidad Antifraude",
  description:
    "Dashboard enterprise para analistas de la Unidad Antifraude. Visualiza el resultado del pipeline antifraude híbrido: reglas críticas, score heurístico y modelo ML.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${syne.variable} ${dmMono.variable} ${dmSans.variable}`}
    >
      <body className="antialiased">
        <DataProvider>
          <AppShell>{children}</AppShell>
        </DataProvider>
      </body>
    </html>
  );
}
