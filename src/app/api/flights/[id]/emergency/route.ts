import { NextResponse } from "next/server";
import { z } from "zod";
import { clearEmergency, declareEmergency, getFlightById } from "@/lib/flights";
import { getSimpleSession } from "@/lib/simple-auth";
import type { FlightStatus } from "@/types";

const DeclareSchema = z.object({
  reason: z.string().min(3).max(500),
  resumeEta: z.string().optional(),
});

const ClearSchema = z.object({
  resumeStatus: z
    .enum(["in_flight", "delayed", "scheduled", "landed"])
    .default("in_flight"),
});

async function requireAuth() {
  const session = await getSimpleSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  const id = Number(params.id);
  if (!Number.isFinite(id))
    return NextResponse.json({ error: "Bad id" }, { status: 400 });
  if (!getFlightById(id))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = DeclareSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const flight = declareEmergency(id, parsed.data.reason, parsed.data.resumeEta);
  return NextResponse.json({ flight });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  const id = Number(params.id);
  if (!Number.isFinite(id))
    return NextResponse.json({ error: "Bad id" }, { status: 400 });
  if (!getFlightById(id))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await req.json().catch(() => ({}));
  const parsed = ClearSchema.safeParse(json ?? {});
  const resumeStatus: FlightStatus = parsed.success
    ? parsed.data.resumeStatus
    : "in_flight";
  const flight = clearEmergency(id, resumeStatus);
  return NextResponse.json({ flight });
}
