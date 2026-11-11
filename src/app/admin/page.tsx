import type { Metadata } from "next";
import { adminConfigured, isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/supabase";
import { getSettings } from "@/lib/session";
import LoginForm from "./LoginForm";
import Dashboard, { Stats } from "./Dashboard";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Radius · Experiment results", robots: { index: false, follow: false } };

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!adminConfigured()) {
    return (
      <div className="adm-login">
        <div className="adm-login-card">
          <h1>Admin not configured</h1>
          <p>Set the <code>ADMIN_ACCESS_CODE</code> environment variable and redeploy.</p>
        </div>
      </div>
    );
  }
  if (!(await isAdmin())) return <LoginForm />;

  const sp = await searchParams;
  const includeTest = sp.test === "1";
  let stats: Stats | null = null;
  let settings: { wtp_enabled: boolean; commute_enabled: boolean } | null = null;
  let problem: string | null = null;
  try {
    const [{ data, error }, s] = await Promise.all([
      db().rpc("exp_admin_stats", { include_test: includeTest }),
      getSettings(),
    ]);
    if (error) throw error;
    stats = data as Stats;
    settings = s;
  } catch (e) {
    const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
    console.error("admin load error", e);
    problem = msg;
  }
  if (problem || !stats || !settings) {
    const missingEnv = /Missing SUPABASE/.test(problem ?? "");
    const missingSchema = /does not exist|schema cache|Could not find/i.test(problem ?? "");
    const badPath = /Invalid path/i.test(problem ?? "");
    const badKey = /Invalid API key|JWT|apikey|401|permission denied/i.test(problem ?? "");
    return (
      <div className="adm-login">
        <div className="adm-login-card">
          <h1>Couldn&apos;t load results</h1>
          <p className="mono" style={{ wordBreak: "break-word" }}>{problem}</p>
          {missingEnv && <p>Add <code>SUPABASE_URL</code> and <code>SUPABASE_SECRET_KEY</code> in Vercel → Settings → Environment Variables (Production), then redeploy.</p>}
          {missingSchema && <p>Run <code>supabase/schema.sql</code> in Supabase → SQL Editor.</p>}
          {badKey && <p>Check that <code>SUPABASE_SECRET_KEY</code> is the <strong>secret</strong> (or service_role) key, not the publishable/anon key, and that <code>SUPABASE_URL</code> is the matching project.</p>}
          {badPath && <p><code>SUPABASE_URL</code> should be just <code>https://xxxx.supabase.co</code> (Project Settings → Data API → Project URL).</p>}
          {!missingEnv && !missingSchema && !badKey && !badPath && <p>Check the Supabase env vars in Vercel and that <code>supabase/schema.sql</code> has been run.</p>}
        </div>
      </div>
    );
  }
  return <Dashboard stats={stats} settings={settings} includeTest={includeTest} />;
}
