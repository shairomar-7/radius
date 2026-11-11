import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function csv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

async function fetchAll(table: string, select: string) {
  const out: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db().from(table).select(select).order("created_at", { ascending: true }).range(from, from + 999);
    if (error) throw error;
    out.push(...((data ?? []) as unknown as Record<string, unknown>[]));
    if (!data || data.length < 1000) return out;
  }
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const kind = req.nextUrl.searchParams.get("kind");
  const includeTest = req.nextUrl.searchParams.get("test") === "1";
  try {
    let rows: Record<string, unknown>[];
    if (kind === "signups") {
      rows = (await fetchAll("exp_signups", "created_at, name, email, session_id, exp_sessions(neighborhood, wtp_price_usd, commute_minutes, is_test, utm_source)"))
        .map((r) => {
          const s = (r.exp_sessions ?? {}) as Record<string, unknown>;
          return { created_at: r.created_at, name: r.name, email: r.email, neighborhood: s.neighborhood, wtp_price_usd: s.wtp_price_usd, commute_minutes: s.commute_minutes, utm_source: s.utm_source, is_test: s.is_test, session_id: r.session_id };
        });
    } else if (kind === "responses") {
      rows = (await fetchAll("experiment_responses", "created_at, experiment, variant, answer, session_id, exp_sessions(neighborhood, is_test)"))
        .map((r) => {
          const s = (r.exp_sessions ?? {}) as Record<string, unknown>;
          return { created_at: r.created_at, experiment: r.experiment, variant: r.variant, answer: r.answer ? "yes" : "no", neighborhood: s.neighborhood, is_test: s.is_test, session_id: r.session_id };
        });
    } else {
      return NextResponse.json({ error: "kind must be signups or responses" }, { status: 400 });
    }
    if (!includeTest) rows = rows.filter((r) => !r.is_test);
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv(rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="radius-${kind}-${stamp}.csv"`,
      },
    });
  } catch (e) {
    console.error("export error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
