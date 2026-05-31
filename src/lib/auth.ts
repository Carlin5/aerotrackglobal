import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { getDb } from "./db";

const SESSION_COOKIE = "at_session";
const ALG = "HS256";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET must be set in .env.local (min 32 characters).",
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string; // username
  uid: number;
}

export async function verifyCredentials(
  username: string,
  password: string,
): Promise<SessionPayload | null> {
  console.log("[AUTH DEBUG] verifyCredentials called for:", username);
  const db = getDb();
  console.log("[AUTH DEBUG] Got database connection");
  const row = db
    .prepare("SELECT id, username, password_hash FROM users WHERE username = ?")
    .get(username) as
    | { id: number; username: string; password_hash: string }
    | undefined;
  console.log("[AUTH DEBUG] User found in DB:", !!row);
  if (!row) {
    console.log("[AUTH DEBUG] User not found in database");
    return null;
  }
  console.log("[AUTH DEBUG] Comparing password with stored hash");
  const ok = bcrypt.compareSync(password, row.password_hash);
  console.log("[AUTH DEBUG] Password comparison result:", ok);
  if (!ok) {
    console.log("[AUTH DEBUG] Password comparison failed");
    return null;
  }
  console.log("[AUTH DEBUG] Authentication successful for user ID:", row.id);
  return { sub: row.username, uid: row.id };
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ uid: payload.uid })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setSubject(payload.sub)
    .setExpirationTime(`${DEFAULT_TTL_SECONDS}s`)
    .sign(getSecret());

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEFAULT_TTL_SECONDS,
  });
}

export function destroySession() {
  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const c = cookies().get(SESSION_COOKIE);
  if (!c?.value) return null;
  try {
    const { payload } = await jwtVerify(c.value, getSecret());
    if (!payload.sub || typeof payload.uid !== "number") return null;
    return { sub: String(payload.sub), uid: payload.uid as number };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
