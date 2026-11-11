import { NextRequest, NextResponse } from "next/server";
import { ensureSession, flowState, getSettings, logEvent } from "@/lib/session";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Records a Yes/No answer. The variant (price / minutes) is read from the session row on the
// server — the client only sends which experiment and the answer, so it can't spoof a variant.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const experiment = body.experiment;
    if ((experiment !== "wtp" && experiment !== "commute") || typeof body.answer !== "boolean") {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    const settings = await getSettings();
    if ((experiment === "wtp" && !settings.wtp_enabled) || (experiment === "commute" && !settings.commute_enabled)) {
      return NextResponse.json({ error: "experiment_off" }, { status: 409 });
    }

    const session = await ensureSession();
    // Questions come after the interest form; refuse answers from sessions that skipped it.
    const { data: signup } = await db().from("exp_signups").select("session_id").eq("session_id", session.id).maybeSingle();
    if (!signup) return NextResponse.json({ error: "signup_first" }, { status: 409 });
    const variant = String(experiment === "wtp" ? session.wtp_price_usd : session.commute_minutes);

    // First answer wins (unique on session_id + experiment).
    const { data, error } = await db()
      .from("experiment_responses")
      .upsert(
        { session_id: session.id, experiment, variant, answer: body.answer },
        { onConflict: "session_id,experiment", ignoreDuplicates: true }
      )
      .select("id");
    if (error) throw error;
    if (data && data.length > 0) {
      await logEvent(session.id, experiment === "wtp" ? "wtp_answered" : "commute_answered", { variant, answer: body.answer });
    }
    return NextResponse.json(await flowState(session));
  } catch (e) {
    console.error("answer error", e);
    return NextResponse.json({ error: "Something went wrong — please try again." }, { status: 500 });
  }
}
