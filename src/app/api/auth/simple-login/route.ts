import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Simple hardcoded login - no database, no env vars needed
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { username?: string; password?: string }
    | null;

  // Hardcoded credentials
  const USERNAME = "admin";
  const PASSWORD = "Tracy@1";

  if (body?.username === USERNAME && body?.password === PASSWORD) {
    // Set a simple session cookie
    const sessionData = JSON.stringify({ username: USERNAME, loginTime: Date.now() });
    cookies().set("simple_session", sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ ok: true, message: "Login successful" });
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
