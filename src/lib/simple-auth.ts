import "server-only";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  signSession,
  verifySession,
  type SessionPayload,
} from "./session-token";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type SimpleSession = SessionPayload;

export async function getSimpleSession(): Promise<SimpleSession | null> {
  const c = cookies().get(SESSION_COOKIE);
  return verifySession(c?.value);
}

export async function createSimpleSession(username: string): Promise<void> {
  const token = await signSession({ username, loginTime: Date.now() });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function destroySimpleSession(): void {
  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function requireSimpleSession(): Promise<SimpleSession> {
  const session = await getSimpleSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

/**
 * Resolve admin credentials from env, with the documented demo defaults so
 * the app still boots before an operator has configured `.env.local` or
 * platform env vars.
 */
export function getAdminCredentials(): { username: string; password: string } {
  return {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "Tracy@1",
  };
}

export function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
