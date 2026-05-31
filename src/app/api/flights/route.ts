import { NextResponse } from "next/server";
import {
  FlightInputSchema,
  createFlight,
  listFlights,
} from "@/lib/flights";

export async function GET() {
  const flights = listFlights();
  return NextResponse.json({ flights });
}

export async function POST(req: Request) {
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
