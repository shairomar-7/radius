import { NextRequest, NextResponse } from "next/server";
import { ensureSession, flowState, logEvent } from "@/lib/session";

export const dynamic = "force-dynamic";

// Called once per page load: creates/loads the anonymous session, logs a visit, returns flow state.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const session = await ensureSession({
      referrer: body.referrer,
      utm_source: body.utm_source,
      user_agent: req.headers.get("user-agent"),
      is_test: body.test === true,
    });
    await logEvent(session.id, "visit", { path: typeof body.path === "string" ? body.path.slice(0, 200) : "/" });
    return NextResponse.json(await flowState(session));
  } catch (e) {
    console.error("session error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
