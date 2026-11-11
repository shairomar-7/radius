import "server-only";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "rx_admin";

/** Cookie token derived from the access code: changing ADMIN_ACCESS_CODE logs everyone out. */
function tokenFor(code: string) {
  return createHash("sha256").update(`radius-admin:v1:${code}`).digest("hex");
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function adminConfigured() {
  return !!process.env.ADMIN_ACCESS_CODE;
}

export function checkCode(input: string): boolean {
  const code = process.env.ADMIN_ACCESS_CODE;
  if (!code) return false;
  return safeEqual(tokenFor(input.trim()), tokenFor(code));
}

export async function grantAdmin() {
  const code = process.env.ADMIN_ACCESS_CODE!;
  (await cookies()).set(ADMIN_COOKIE, tokenFor(code), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function isAdmin(): Promise<boolean> {
  const code = process.env.ADMIN_ACCESS_CODE;
  if (!code) return false;
  const v = (await cookies()).get(ADMIN_COOKIE)?.value;
  return !!v && safeEqual(v, tokenFor(code));
}

export async function revokeAdmin() {
  (await cookies()).delete(ADMIN_COOKIE);
}
