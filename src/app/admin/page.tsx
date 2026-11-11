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
  const [{ data, error }, settings] = await Promise.all([
    db().rpc("exp_admin_stats", { include_test: includeTest }),
    getSettings(),
  ]);
  if (error) {
    return (
      <div className="adm-login">
        <div className="adm-login-card">
          <h1>Couldn&apos;t load results</h1>
          <p>{error.message}</p>
          <p>Has <code>supabase/schema.sql</code> been run in the Supabase SQL editor?</p>
        </div>
      </div>
    );
  }
  return <Dashboard stats={data as Stats} settings={settings} includeTest={includeTest} />;
}
