"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkCode, grantAdmin, isAdmin, revokeAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/supabase";

export async function login(_prev: { error?: string } | undefined, form: FormData) {
  const code = String(form.get("code") ?? "");
  if (!checkCode(code)) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return { error: "That code didn't work." };
  }
  await grantAdmin();
  redirect("/admin");
}

export async function logout() {
  await revokeAdmin();
  redirect("/admin");
}

export async function setExperiment(key: "wtp_enabled" | "commute_enabled", enabled: boolean) {
  if (!(await isAdmin())) throw new Error("unauthorized");
  const { error } = await db()
    .from("exp_settings")
    .upsert({ key, value: enabled, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
  revalidatePath("/admin");
}
