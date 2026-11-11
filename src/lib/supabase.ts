import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Server-only Supabase client using the secret (service-role) key.
 * The experiment tables have RLS on with no policies, so this key is the only way in —
 * never import this from a client component.
 */
export function db(): SupabaseClient {
  if (client) return client;
  // Accept common copy-paste variants: trailing slash, /rest/v1, whitespace, quotes.
  const raw = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^["']|["']$/g, "");
  let url = raw;
  try {
    if (raw) url = new URL(raw).origin;
  } catch {
    url = raw;
  }
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/^["']|["']$/g, "");
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) env vars");
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
