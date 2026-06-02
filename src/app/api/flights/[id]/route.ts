import { NextResponse } from 'next/server';
import {
  FlightInputSchema,
  deleteFlight,
  getFlightById,
  setLive,
  setStatus,
  updateFlight,
} from '@/lib/flights';
import { ensureDbReady, persistDb } from '@/lib/db';
import { getSimpleSession } from '@/lib/simple-auth';
import type { FlightStatus } from '@/types';

async function requireAuth() {
  const session = await getSimpleSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
  try {
    const id = parseId(params.id);
    if (id == null)
      return NextResponse.json({ error: 'Bad id' }, { status: 400 });
    await ensureDbReady();
    const flight = await getFlightById(id);
    if (!flight)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ flight });
  } catch (err) {
    console.error('[api/flights/[id]] GET failed:', err);
    return NextResponse.json(
      {
        error: 'Database error',
        detail: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const id = parseId(params.id);
    if (id == null)
      return NextResponse.json({ error: 'Bad id' }, { status: 400 });
    const json = await req.json().catch(() => null);
    const parsed = FlightInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.issues },
        { status: 400 },
      );
    }
    await ensureDbReady();
    const flight = await updateFlight(id, parsed.data);
    await persistDb();
    return NextResponse.json({ flight });
  } catch (err) {
    console.error('[api/flights/[id]] PUT failed:', err);
    return NextResponse.json(
      {
        error: 'Database error',
        detail: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const id = parseId(params.id);
    if (id == null)
      return NextResponse.json({ error: 'Bad id' }, { status: 400 });
    const body = (await req.json().catch(() => null)) as
      | { isLive?: boolean; status?: FlightStatus }
      | null;
    if (!body)
      return NextResponse.json({ error: 'Empty body' }, { status: 400 });

    await ensureDbReady();
    let flight = await getFlightById(id);
    if (!flight)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (typeof body.isLive === 'boolean') flight = await setLive(id, body.isLive);
    if (body.status) flight = await setStatus(id, body.status);
    await persistDb();
    return NextResponse.json({ flight });
  } catch (err) {
    console.error('[api/flights/[id]] PATCH failed:', err);
    return NextResponse.json(
      {
        error: 'Database error',
        detail: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const id = parseId(params.id);
    if (id == null)
      return NextResponse.json({ error: 'Bad id' }, { status: 400 });
    await ensureDbReady();
    await deleteFlight(id);
    await persistDb();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/flights/[id]] DELETE failed:', err);
    return NextResponse.json(
      {
        error: 'Database error',
        detail: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
