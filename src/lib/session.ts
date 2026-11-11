import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { db } from "./supabase";
import type { FlowState } from "./types";

export const SESSION_COOKIE = "rx_sid";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SessionRow {
  id: string;
  wtp_price_usd: number;
  commute_minutes: number;
  neighborhood: string | null;
  is_test: boolean;
}

export interface FirstVisitInfo {
  referrer?: string | null;
  utm_source?: string | null;
  user_agent?: string | null;
  is_test?: boolean;
}

function clip(v: unknown, n: number): string | null {
  return typeof v === "string" && v.length ? v.slice(0, n) : null;
}

/**
 * Returns this visitor's session, creating it (and its variant assignments) on first visit.
 * Variants are assigned by column defaults in Postgres on INSERT and never updated, so they are
 * sticky for the life of the cookie: refreshes and return visits see the same price / minutes.
 */
export async function ensureSession(info: FirstVisitInfo = {}): Promise<SessionRow> {
  const store = await cookies();
  let id = store.get(SESSION_COOKIE)?.value;
  if (!id || !UUID_RE.test(id)) id = randomUUID();

  store.set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });

  const supa = db();
  const { error: insErr } = await supa.from("exp_sessions").upsert(
    {
      id,
      referrer: clip(info.referrer, 500),
      utm_source: clip(info.utm_source, 100),
      user_agent: clip(info.user_agent, 400),
      is_test: !!info.is_test,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );
  if (insErr) throw insErr;

  const { data, error } = await supa
    .from("exp_sessions")
    .select("id, wtp_price_usd, commute_minutes, neighborhood, is_test")
    .eq("id", id)
    .single();
  if (error) throw error;

  // ?test=1 on a later visit can still mark an existing session as test traffic.
  if (info.is_test && !data.is_test) {
    await supa.from("exp_sessions").update({ is_test: true }).eq("id", id);
    data.is_test = true;
  }
  return data as SessionRow;
}

export async function logEvent(sessionId: string, event: string, meta?: Record<string, unknown>) {
  const { error } = await db().from("exp_events").insert({ session_id: sessionId, event, meta: meta ?? null });
  if (error) throw error;
}

export async function getSettings(): Promise<{ wtp_enabled: boolean; commute_enabled: boolean }> {
  const { data, error } = await db().from("exp_settings").select("key, value");
  if (error) throw error;
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return {
    wtp_enabled: map.wtp_enabled !== false,
    commute_enabled: map.commute_enabled === true,
  };
}

export async function flowState(s: SessionRow): Promise<FlowState> {
  const supa = db();
  const [settings, signup, responses] = await Promise.all([
    getSettings(),
    supa.from("exp_signups").select("name").eq("session_id", s.id).maybeSingle(),
    supa.from("experiment_responses").select("experiment").eq("session_id", s.id),
  ]);
  if (signup.error) throw signup.error;
  if (responses.error) throw responses.error;
  const answered = new Set((responses.data ?? []).map((r) => r.experiment));
  return {
    signedUp: !!signup.data,
    firstName: signup.data?.name?.split(/\s+/)[0] ?? null,
    neighborhood: s.neighborhood,
    // A price is only revealed to the client when that experiment is live.
    wtp: {
      enabled: settings.wtp_enabled,
      answered: answered.has("wtp"),
      price: settings.wtp_enabled ? s.wtp_price_usd : null,
    },
    commute: {
      enabled: settings.commute_enabled,
      answered: answered.has("commute"),
      minutes: settings.commute_enabled ? s.commute_minutes : null,
    },
  };
}
