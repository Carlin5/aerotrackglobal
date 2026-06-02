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
    await ensureDbReady();
    const flight = await createFlight(parsed.data);
    await persistDb();
    console.log('[api/flights] Flight created:', flight.trackingId);

    return NextResponse.json({ flight }, { status: 201 });
  } catch (err) {
    console.error('[api/flights] POST failed:', err);
    // Robust error serialization — handles Error, objects, strings, undefined
    let message = 'Unknown error';
    let detail = '';
    if (err instanceof Error) {
      message = err.message;
      detail = err.stack || err.message;
    } else if (err && typeof err === 'object') {
      // Supabase/PostgREST errors often have .message, .code, .details
      const anyErr = err as Record<string, unknown>;
      message = String(anyErr.message || anyErr.error_description || anyErr.error || JSON.stringify(err));
      detail = JSON.stringify(err);
    } else if (err !== undefined && err !== null) {
      message = String(err);
    }
    console.error('[api/flights] Full error:', detail || message);
    return NextResponse.json(
      {
        error: 'Failed to create flight',
        detail: message,
        debug: detail,
      },
      { status: 500 },
    );
  }
}
