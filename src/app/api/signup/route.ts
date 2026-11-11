import { NextRequest, NextResponse } from "next/server";
import { ensureSession, flowState, logEvent } from "@/lib/session";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const session = await ensureSession();

    // Honeypot: real people never see or fill this field.
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return NextResponse.json(await flowState(session));
    }

    const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (name.length < 1 || name.length > 120) {
      return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    }
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    }

    // One signup per session; re-submitting updates the name/email but doesn't double-count.
    const { data: existing } = await db().from("exp_signups").select("session_id").eq("session_id", session.id).maybeSingle();
    const { error } = await db().from("exp_signups").upsert({ session_id: session.id, name, email }, { onConflict: "session_id" });
    if (error) throw error;
    if (!existing) await logEvent(session.id, "form_submitted");

    return NextResponse.json(await flowState(session));
  } catch (e) {
    console.error("signup error", e);
    return NextResponse.json({ error: "Something went wrong — please try again." }, { status: 500 });
  }
}
