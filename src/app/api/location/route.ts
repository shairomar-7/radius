import { NextRequest, NextResponse } from "next/server";
import { ensureSession } from "@/lib/session";
import { db } from "@/lib/supabase";
import { NEIGHBORHOOD_NAMES } from "@/lib/neighborhoods";

export const dynamic = "force-dynamic";

// Stores the coarse neighborhood only. The browser resolves geolocation to a neighborhood name
// locally; this route rejects anything that isn't a known neighborhood name (so no coordinates).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const method = body.method === "geolocation" ? "geolocation" : "picker";
    if (typeof body.neighborhood !== "string" || !NEIGHBORHOOD_NAMES.has(body.neighborhood)) {
      return NextResponse.json({ error: "bad_neighborhood" }, { status: 400 });
    }
    const session = await ensureSession();
    const { error } = await db()
      .from("exp_sessions")
      .update({ neighborhood: body.neighborhood, location_method: method, last_seen_at: new Date().toISOString() })
      .eq("id", session.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("location error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
