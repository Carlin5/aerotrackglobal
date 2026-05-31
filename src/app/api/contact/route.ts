import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";

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

  const db = getDb();
  db.prepare(
    `INSERT INTO contact_messages (name, email, company, subject, message)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    parsed.data.name,
    parsed.data.email,
    parsed.data.company ?? null,
    parsed.data.subject,
    parsed.data.message,
  );

  return NextResponse.json({ ok: true });
}
