import { NextRequest, NextResponse } from "next/server";
import { ensureSession, logEvent } from "@/lib/session";
import { CLIENT_EVENTS, ClientEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

// Client-reported funnel steps. Server-side steps (visit, form_submitted, *_answered) are logged by
// their own routes so they can't be faked from the browser.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!CLIENT_EVENTS.includes(body.event as ClientEvent)) {
      return NextResponse.json({ error: "bad_event" }, { status: 400 });
    }
    const session = await ensureSession();
    await logEvent(session.id, body.event);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("track error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
