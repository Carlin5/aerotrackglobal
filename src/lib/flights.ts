import 'server-only';
import { z } from 'zod';
import { getDb } from './db';
import type {
  Cargo,
  EmergencySnapshot,
  FlightRecord,
  FlightStatus,
  Party,
  Waypoint,
} from '@/types';
import { generateFlightNumber, generateTrackingId } from './tracking-id';
import { buildRoutePlan, computeLivePosition } from './simulation';

interface FlightRow {
  id: number;
  tracking_id: string;
  flight_number: string;
  aircraft: string;
  origin_code: string;
  destination_code: string;
  waypoints_json: string;
  cruise_kmh: number;
  departure_at: string;
  status: FlightStatus;
  is_live: boolean;
  cargo_json: string;
  shipper_json: string;
  consignee_json: string;
  notes: string | null;
  emergency_json: string | null;
  created_at: string;
  updated_at: string;
}

function rowToFlight(r: FlightRow): FlightRecord {
  return {
    id: r.id,
    trackingId: r.tracking_id,
    flightNumber: r.flight_number,
    aircraft: r.aircraft,
    originCode: r.origin_code,
    destinationCode: r.destination_code,
    waypoints: JSON.parse(r.waypoints_json) as Waypoint[],
    cruiseKmh: r.cruise_kmh,
    departureAt: r.departure_at,
    status: r.status,
    isLive: r.is_live,
    cargo: JSON.parse(r.cargo_json) as Cargo,
    shipper: JSON.parse(r.shipper_json) as Party,
    consignee: JSON.parse(r.consignee_json) as Party,
    notes: r.notes ?? undefined,
    emergency: r.emergency_json
      ? (JSON.parse(r.emergency_json) as EmergencySnapshot)
      : undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const FlightInputSchema = z.object({
  flightNumber: z.string().min(2).max(16).optional(),
  aircraft: z.string().min(2).max(80).default('Boeing 747-8F'),
  originCode: z.string().length(3),
  destinationCode: z.string().length(3),
  waypoints: z
    .array(
      z.object({
        code: z.string().length(3),
        stopMinutes: z.coerce.number().int().min(0).max(48 * 60).default(60),
      }),
    )
    .default([]),
  cruiseKmh: z.coerce.number().int().min(400).max(1200).default(880),
  departureAt: z.string().min(8), // ISO 8601
  status: z
    .enum([
      'scheduled',
      'boarding',
      'in_flight',
      'landed',
      'delivered',
      'delayed',
      'cancelled',
      'emergency_stop',
    ])
    .default('scheduled'),
  isLive: z.coerce.boolean().default(false),
  cargo: z.object({
    description: z.string().min(2).max(280),
    weightKg: z.coerce.number().min(0).max(500_000),
    pieces: z.coerce.number().int().min(1).max(100_000).default(1),
    declaredValueUsd: z.coerce.number().min(0).max(1_000_000_000).default(0),
    hazardous: z.coerce.boolean().default(false),
    temperatureControlled: z.coerce.boolean().default(false),
    dimensions: z.string().max(80).optional(),
    reference: z.string().max(80).optional(),
  }),
  shipper: z.object({
    name: z.string().min(2).max(120),
    company: z.string().max(160).optional(),
    email: z
      .string()
      .email()
      .max(160)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    phone: z.string().max(40).optional(),
    address: z.string().max(280).optional(),
  }),
  consignee: z.object({
    name: z.string().min(2).max(120),
    company: z.string().max(160).optional(),
    email: z
      .string()
      .email()
      .max(160)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    phone: z.string().max(40).optional(),
    address: z.string().max(280).optional(),
  }),
  notes: z.string().max(2000).optional(),
});
export type FlightInput = z.infer<typeof FlightInputSchema>;

export async function listFlights(): Promise<FlightRecord[]> {
  try {
    const { data, error } = await getDb()
      .from('flights')
      .select('*')
      .order('departure_at', { ascending: false });

    if (error) {
      // Table doesn't exist yet — return empty list so page doesn't crash
      if (error.code === 'PGRST205' || error.message?.includes("Could not find the table")) {
        console.warn('[flights] flights table not found in Supabase. Run scripts/supabase-setup.sql');
        return [];
      }
      throw error;
    }
    return (data as FlightRow[]).map(rowToFlight);
  } catch (err) {
    console.error('[flights] listFlights failed:', err);
    throw err;
  }
}

export async function getFlightById(id: number): Promise<FlightRecord | null> {
  try {
    const { data, error } = await getDb()
      .from('flights')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code === 'PGRST116') {
      // Not found
      return null;
    }
    if (error) throw error;
    return data ? rowToFlight(data as FlightRow) : null;
  } catch (err) {
    console.error('[flights] getFlightById failed:', err);
    throw err;
  }
}

export async function getFlightByTrackingId(
  trackingId: string,
): Promise<FlightRecord | null> {
  try {
    const { data, error } = await getDb()
      .from('flights')
      .select('*')
      .eq('tracking_id', trackingId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Not found
      return null;
    }
    if (error) throw error;
    return data ? rowToFlight(data as FlightRow) : null;
  } catch (err) {
    console.error('[flights] getFlightByTrackingId failed:', err);
    throw err;
  }
}

export async function createFlight(
  input: FlightInput,
): Promise<FlightRecord> {
  try {
    console.log('[flights] createFlight started');
    const trackingId = await generateUniqueTrackingId();
    console.log('[flights] generated trackingId:', trackingId);
    const flightNumber = input.flightNumber?.trim() || generateFlightNumber();
    console.log('[flights] generated flightNumber:', flightNumber);

    const insertPayload = {
      tracking_id: trackingId,
      flight_number: flightNumber,
      aircraft: input.aircraft,
      origin_code: input.originCode.toUpperCase(),
      destination_code: input.destinationCode.toUpperCase(),
      waypoints_json: JSON.stringify(
        input.waypoints.map((w) => ({ ...w, code: w.code.toUpperCase() })),
      ),
      cruise_kmh: input.cruiseKmh,
      departure_at: input.departureAt,
      status: input.status,
      is_live: input.isLive,
      cargo_json: JSON.stringify(input.cargo),
      shipper_json: JSON.stringify(input.shipper),
      consignee_json: JSON.stringify(input.consignee),
      notes: input.notes ?? null,
    };
    console.log('[flights] insert payload keys:', Object.keys(insertPayload));

    const { data, error } = await getDb()
      .from('flights')
      .insert([insertPayload])
      .select()
      .single();

    console.log('[flights] insert result - error:', error ? error.message : 'none');
    console.log('[flights] insert result - data:', data ? 'has data' : 'no data');

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes("Could not find the table")) {
        throw new Error(
          'The flights table does not exist in Supabase. Please run the setup SQL in scripts/supabase-setup.sql',
        );
      }
      throw error;
    }
    if (!data) throw new Error('Failed to create flight');

    return rowToFlight(data as FlightRow);
  } catch (err) {
    console.error('[flights] createFlight failed:', err);
    throw err;
  }
}

export async function updateFlight(
  id: number,
  input: FlightInput,
): Promise<FlightRecord> {
  try {
    const { data, error } = await getDb()
      .from('flights')
      .update({
        flight_number: input.flightNumber?.trim() || generateFlightNumber(),
        aircraft: input.aircraft,
        origin_code: input.originCode.toUpperCase(),
        destination_code: input.destinationCode.toUpperCase(),
        waypoints_json: JSON.stringify(
          input.waypoints.map((w) => ({ ...w, code: w.code.toUpperCase() })),
        ),
        cruise_kmh: input.cruiseKmh,
        departure_at: input.departureAt,
        status: input.status,
        is_live: input.isLive,
        cargo_json: JSON.stringify(input.cargo),
        shipper_json: JSON.stringify(input.shipper),
        consignee_json: JSON.stringify(input.consignee),
        notes: input.notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Flight not found');

    return rowToFlight(data as FlightRow);
  } catch (err) {
    console.error('[flights] updateFlight failed:', err);
    throw err;
  }
}

export async function deleteFlight(id: number): Promise<void> {
  try {
    const { error } = await getDb().from('flights').delete().eq('id', id);

    if (error) throw error;
  } catch (err) {
    console.error('[flights] deleteFlight failed:', err);
    throw err;
  }
}

export async function setLive(
  id: number,
  isLive: boolean,
): Promise<FlightRecord> {
  try {
    const { data, error } = await getDb()
      .from('flights')
      .update({
        is_live: isLive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Flight not found');

    return rowToFlight(data as FlightRow);
  } catch (err) {
    console.error('[flights] setLive failed:', err);
    throw err;
  }
}

export async function setStatus(
  id: number,
  status: FlightStatus,
): Promise<FlightRecord> {
  try {
    const { data, error } = await getDb()
      .from('flights')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Flight not found');

    return rowToFlight(data as FlightRow);
  } catch (err) {
    console.error('[flights] setStatus failed:', err);
    throw err;
  }
}

export async function declareEmergency(
  id: number,
  reason: string,
  resumeEta?: string,
): Promise<FlightRecord> {
  try {
    const flight = await getFlightById(id);
    if (!flight) throw new Error('Flight not found');

    const plan = buildRoutePlan(flight);
    const pos = computeLivePosition(
      {
        ...flight,
        isLive: true,
        status: flight.status === 'scheduled' ? 'in_flight' : flight.status,
      },
      plan,
      new Date(),
    );

    const snapshot: EmergencySnapshot = {
      declaredAt: new Date().toISOString(),
      reason: reason.trim().slice(0, 500),
      lat: pos.lat,
      lng: pos.lng,
      bearing: pos.bearing,
      altitudeM: pos.altitudeM,
      groundSpeedKmh: pos.groundSpeedKmh,
      legIndex: pos.currentLegIndex,
      segmentProgress: pos.segmentProgress,
      resumeEta: resumeEta?.trim() ? resumeEta : undefined,
    };

    const { data, error } = await getDb()
      .from('flights')
      .update({
        status: 'emergency_stop',
        is_live: true,
        emergency_json: JSON.stringify(snapshot),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Flight not found');

    return rowToFlight(data as FlightRow);
  } catch (err) {
    console.error('[flights] declareEmergency failed:', err);
    throw err;
  }
}

export async function clearEmergency(
  id: number,
  resumeStatus: FlightStatus = 'in_flight',
): Promise<FlightRecord> {
  try {
    const { data, error } = await getDb()
      .from('flights')
      .update({
        status: resumeStatus,
        emergency_json: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Flight not found');

    return rowToFlight(data as FlightRow);
  } catch (err) {
    console.error('[flights] clearEmergency failed:', err);
    throw err;
  }
}

async function generateUniqueTrackingId(): Promise<string> {
  console.log('[flights] generateUniqueTrackingId started');
  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const id = generateTrackingId();
    console.log('[flights] checking trackingId attempt', attempt, id);
    const { data, error } = await getDb()
      .from('flights')
      .select('id')
      .eq('tracking_id', id)
      .single();

    if (error) {
      console.log('[flights] uniqueness check error:', error.code, error.message);
      // PGRST116 = no rows found (which means ID is available)
      if (error.code === 'PGRST116') return id;
      throw error;
    }
    if (!data) return id;
    console.log('[flights] trackingId already exists:', id);
  }
  // Fallback with timestamp
  return generateTrackingId() + '-' + Date.now().toString(36).toUpperCase();
}
