import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const ContactSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  company: z.string().max(160).optional(),
  subject: z.string().min(2).max(160),
  message: z.string().min(10).max(2000),
  // simple honeypot — bots fill all fields, humans never see this
  website: z.string().max(0).optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = ContactSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  if (parsed.data.website && parsed.data.website.length > 0) {
    // honeypot tripped — pretend success
    return NextResponse.json({ ok: true });
  }

  const { error } = await db
    .from('contact_messages')
    .insert({
      name: parsed.data.name,
      email: parsed.data.email,
      company: parsed.data.company ?? null,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });

  if (error) {
    console.error('[contact] insert failed:', error);
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
