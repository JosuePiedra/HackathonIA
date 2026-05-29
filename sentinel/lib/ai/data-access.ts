import { getSinestrosCompletos } from "@/lib/queries";
import type { SiniestroCompleto } from "@/lib/types";

export async function loadScoredClaims(): Promise<SiniestroCompleto[]> {
  return getSinestrosCompletos();
}
