import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Simple hardcoded login - no database, no env vars needed
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { username?: string; password?: string }
    | null;

  console.log("[SIMPLE_LOGIN] Request received:", { username: body?.username, hasPassword: !!body?.password });

  // Hardcoded credentials
  const USERNAME = "admin";
  const PASSWORD = "Tracy@1";

  if (body?.username === USERNAME && body?.password === PASSWORD) {
    console.log("[SIMPLE_LOGIN] Credentials valid, setting session");
    // Set a simple session cookie
    const sessionData = JSON.stringify({ username: USERNAME, loginTime: Date.now() });
    cookies().set("simple_session", sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    console.log("[SIMPLE_LOGIN] Session cookie set successfully");
    return NextResponse.json({ ok: true, message: "Login successful" });
  }

  console.log("[SIMPLE_LOGIN] Invalid credentials");
  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
