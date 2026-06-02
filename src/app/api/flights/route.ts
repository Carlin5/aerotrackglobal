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
    await ensureDbReady();
    const flights = await listFlights();
    return NextResponse.json({ flights });
  } catch (err) {
    console.error('[api/flights] GET failed:', err);
    return NextResponse.json(
      {
        error: 'Database error',
        detail: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const session = await getSimpleSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const json = await req.json().catch(() => null);
    const parsed = FlightInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.issues },
        { status: 400 },
      );
    }

    await ensureDbReady();
    const flight = await createFlight(parsed.data);
    await persistDb();

    return NextResponse.json({ flight }, { status: 201 });
  } catch (err) {
    console.error('[api/flights] POST failed:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    const fullError = err instanceof Error ? err.stack || err.message : String(err);
    console.error('[api/flights] Full error:', fullError);
    return NextResponse.json(
      {
        error: 'Failed to create flight',
        detail: message,
        stack: process.env.NODE_ENV === 'development' ? fullError : undefined,
      },
      { status: 500 },
    );
  }
}
