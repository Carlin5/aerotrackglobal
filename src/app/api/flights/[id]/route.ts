import { NextResponse } from "next/server";
import {
  FlightInputSchema,
  deleteFlight,
  getFlightById,
  setLive,
  setStatus,
  updateFlight,
} from "@/lib/flights";
import { getSimpleSession } from "@/lib/simple-auth";
import type { FlightStatus } from "@/types";

async function requireAuth() {
  const session = await getSimpleSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isFinite(id)) return null;
  return id;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  const id = parseId(params.id);
  if (id == null)
    return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const flight = getFlightById(id);
  if (!flight)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ flight });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  const id = parseId(params.id);
  if (id == null)
    return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const json = await req.json().catch(() => null);
  const parsed = FlightInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const flight = updateFlight(id, parsed.data);
  return NextResponse.json({ flight });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  const id = parseId(params.id);
  if (id == null)
    return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const body = (await req.json().catch(() => null)) as
    | { isLive?: boolean; status?: FlightStatus }
    | null;
  if (!body)
    return NextResponse.json({ error: "Empty body" }, { status: 400 });

  let flight = getFlightById(id);
  if (!flight)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (typeof body.isLive === "boolean") flight = setLive(id, body.isLive);
  if (body.status) flight = setStatus(id, body.status);
  return NextResponse.json({ flight });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  const id = parseId(params.id);
  if (id == null)
    return NextResponse.json({ error: "Bad id" }, { status: 400 });
  deleteFlight(id);
  return NextResponse.json({ ok: true });
}
