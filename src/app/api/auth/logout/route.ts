import { NextResponse } from "next/server";
import { destroySimpleSession } from "@/lib/simple-auth";

export async function POST() {
  destroySimpleSession();
  return NextResponse.json({ ok: true });
}
