import { NextResponse } from "next/server";
import {
  FlightInputSchema,
  createFlight,
  listFlights,
} from "@/lib/flights";
import { getSimpleSession } from "@/lib/simple-auth";

export async function GET() {
  const session = getSimpleSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const flights = listFlights();
  return NextResponse.json({ flights });
}

export async function POST(req: Request) {
  const session = getSimpleSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const json = await req.json().catch(() => null);
  const parsed = FlightInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const flight = createFlight(parsed.data);
  return NextResponse.json({ flight }, { status: 201 });
}
