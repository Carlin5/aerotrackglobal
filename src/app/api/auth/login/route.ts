import { NextResponse } from "next/server";
import { createSession, verifyCredentials } from "@/lib/auth";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { username?: string; password?: string }
    | null;
  
  // DEBUG: Log what we received
  console.log("[LOGIN DEBUG] Request body:", { username: body?.username, hasPassword: !!body?.password });
  
  if (!body?.username || !body?.password) {
    console.log("[LOGIN DEBUG] Missing credentials");
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }
  
  console.log("[LOGIN DEBUG] Attempting verifyCredentials for:", body.username);
  const session = await verifyCredentials(body.username, body.password);
  console.log("[LOGIN DEBUG] verifyCredentials result:", !!session);
  
  if (!session) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  
  console.log("[LOGIN DEBUG] Creating session...");
  await createSession(session);
  console.log("[LOGIN DEBUG] Login successful");
  return NextResponse.json({ ok: true });
}
