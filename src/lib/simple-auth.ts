import "server-only";
import { cookies } from "next/headers";

export interface SimpleSession {
  username: string;
  loginTime: number;
}

export function getSimpleSession(): SimpleSession | null {
  const c = cookies().get("simple_session");
  if (!c?.value) {
    console.log("[SIMPLE_AUTH] No session cookie found");
    return null;
  }
  
  try {
    const session = JSON.parse(c.value) as SimpleSession;
    console.log("[SIMPLE_AUTH] Session found:", { username: session.username, loginTime: session.loginTime });
    return session;
  } catch (error) {
    console.log("[SIMPLE_AUTH] Failed to parse session:", error);
    return null;
  }
}

export function createSimpleSession(username: string) {
  const sessionData = JSON.stringify({ username, loginTime: Date.now() });
  cookies().set("simple_session", sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function destroySimpleSession() {
  cookies().set("simple_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function requireSimpleSession(): SimpleSession {
  const session = getSimpleSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}
