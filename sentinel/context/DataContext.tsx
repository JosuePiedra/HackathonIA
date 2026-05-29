"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getSinestrosCompletos, getReglasBySiniestro } from "@/lib/queries";
import { computeStats } from "@/lib/claimsUtils";
import type { SiniestroCompleto, ClaimsStats, ReglaAlerta } from "@/lib/types";

interface DataContextValue {
  claims: SiniestroCompleto[];
  stats: ClaimsStats;
  isLoading: boolean;
  error: string | null;
  /** true cuando Supabase está configurado y la carga no falló. */
  connected: boolean;
  supabaseConfigured: boolean;
  /** Recarga los siniestros scoreados desde la vista de Supabase. */
  refresh: () => Promise<void>;
  getReglasBySiniestroId: (id: string) => Promise<ReglaAlerta[]>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [claims, setClaims] = useState<SiniestroCompleto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const bootstrapped = useRef(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!isSupabaseConfigured()) {
        throw new Error(
          "Supabase no está configurado. Definí NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local.",
        );
      }
      const data = await getSinestrosCompletos();
      setClaims(data);
      setConnected(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Error al cargar datos de Supabase.",
      );
      setConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // La app está siempre conectada a Supabase: cargamos al montar.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    void refresh();
  }, [refresh]);

  const getReglasBySiniestroId = useCallback(
    (id: string): Promise<ReglaAlerta[]> => getReglasBySiniestro(id),
    [],
  );

  const stats = useMemo(() => computeStats(claims), [claims]);

  const value = useMemo<DataContextValue>(
    () => ({
      claims,
      stats,
      isLoading,
      error,
      connected,
      supabaseConfigured: isSupabaseConfigured(),
      refresh,
      getReglasBySiniestroId,
    }),
    [claims, stats, isLoading, error, connected, refresh, getReglasBySiniestroId],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData debe usarse dentro de <DataProvider>.");
  return ctx;
}
