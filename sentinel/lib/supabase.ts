import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder-anon-key"
);

export function isSupabaseConfigured(): boolean {
  return Boolean(url && key && url.startsWith("https://") && key.length > 20);
}
