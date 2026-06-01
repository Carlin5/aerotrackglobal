/**
 * Edge-safe session token helpers.
 *
 * The session is a short JSON payload + an HMAC-SHA256 signature over its
 * base64url-encoded form, joined with a `.`:
 *
 *     <base64url(JSON)> "." <base64url(HMAC-SHA256(base64url(JSON), secret))>
 *
 * This module intentionally uses only the Web Crypto API and standard
 * globals (`btoa`, `atob`, `TextEncoder`) so it can run in both the Next.js
 * Edge runtime (middleware) and Node.js (route handlers / server
 * components).
 */

export interface SessionPayload {
  username: string;
  loginTime: number;
}

export const SESSION_COOKIE = "simple_session";

const ENC = new TextEncoder();
const DEC = new TextDecoder();

function getSecret(): string {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.SESSION_SECRET ||
    // Last-resort default so the demo still boots without env vars. Sites
    // running in production should always set AUTH_SECRET — this fallback
    // is logged as a warning by the server-side helper on first use.
    "aerotrack-default-secret-set-AUTH_SECRET-in-env-please-change";
  return secret;
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    ENC.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, ENC.encode(payload));
  return b64url(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function signSession(
  payload: SessionPayload,
  secret: string = getSecret(),
): Promise<string> {
  const body = b64url(ENC.encode(JSON.stringify(payload)));
  const sig = await hmac(body, secret);
  return `${body}.${sig}`;
}

export async function verifySession(
  token: string | undefined,
  secret: string = getSecret(),
): Promise<SessionPayload | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(body, secret);
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(
      DEC.decode(b64urlDecode(body)),
    ) as SessionPayload;
    if (
      typeof payload.username !== "string" ||
      typeof payload.loginTime !== "number"
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
