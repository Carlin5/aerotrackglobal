import { NextResponse } from "next/server";
import {
  constantTimeEquals,
  createSimpleSession,
  getAdminCredentials,
} from "@/lib/simple-auth";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { username?: string; password?: string }
    | null;

  if (!body?.username || !body?.password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const { username, password } = getAdminCredentials();
  const ok =
    constantTimeEquals(body.username, username) &&
    constantTimeEquals(body.password, password);

  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await createSimpleSession(username);
  return NextResponse.json({ ok: true });
}
