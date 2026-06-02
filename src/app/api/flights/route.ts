import { NextResponse } from 'next/server';
import {
  FlightInputSchema,
  createFlight,
  listFlights,
} from '@/lib/flights';
import { ensureDbReady, persistDb } from '@/lib/db';
import { getSimpleSession } from '@/lib/simple-auth';

export async function GET() {
  const session = await getSimpleSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const flights = await listFlights();
    return NextResponse.json({ flights });
  } catch (err) {
    console.error('[api/flights] GET failed:', err);
    const isErrLike = err && typeof err === 'object' && 'message' in err && typeof (err as Error).message === 'string';
    const message = isErrLike ? (err as Error).message : String(err);
    return NextResponse.json({ error: 'Database error', detail: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSimpleSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const json = await req.json().catch(() => null);
    console.log('[api/flights] POST received body keys:', json ? Object.keys(json) : 'null');
    const parsed = FlightInputSchema.safeParse(json);
    if (!parsed.success) {
      console.log('[api/flights] Validation failed:', parsed.error.issues);
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.issues },
        { status: 400 },
      );
    }

    console.log('[api/flights] Validation passed, creating flight...');
    const flight = await createFlight(parsed.data);
    await persistDb();
    console.log('[api/flights] Flight created:', flight.trackingId);

    return NextResponse.json({ flight }, { status: 201 });
  } catch (err) {
    console.error('[api/flights] POST failed:', err);
    // Duck-typing: realm-safe check for Error-like objects in serverless
    const isErrLike =
      err && typeof err === 'object' && 'message' in err && typeof (err as Error).message === 'string';
    const message = isErrLike
      ? (err as Error).message
      : err !== undefined && err !== null
        ? String(err)
        : 'Unknown error';
    const detail = isErrLike
      ? (err as Error).stack || (err as Error).message
      : JSON.stringify(err);
    console.error('[api/flights] Full error:', detail);
    return NextResponse.json(
      { error: 'Failed to create flight', detail: message, debug: detail },
      { status: 500 },
    );
  }
}
