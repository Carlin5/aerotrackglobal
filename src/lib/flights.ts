import "server-only";
import { z } from "zod";
import { getDb } from "./db";
import type {
  Cargo,
  EmergencySnapshot,
  FlightRecord,
  FlightStatus,
  Party,
  Waypoint,
} from "@/types";
import { generateFlightNumber, generateTrackingId } from "./tracking-id";
import { buildRoutePlan, computeLivePosition } from "./simulation";

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
  is_live: number;
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
    isLive: !!r.is_live,
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
  aircraft: z.string().min(2).max(80).default("Boeing 747-8F"),
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
      "scheduled",
      "boarding",
      "in_flight",
      "landed",
      "delivered",
      "delayed",
      "cancelled",
      "emergency_stop",
    ])
    .default("scheduled"),
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
    email: z.string().email().max(160).optional().or(z.literal("").transform(() => undefined)),
    phone: z.string().max(40).optional(),
    address: z.string().max(280).optional(),
  }),
  consignee: z.object({
    name: z.string().min(2).max(120),
    company: z.string().max(160).optional(),
    email: z.string().email().max(160).optional().or(z.literal("").transform(() => undefined)),
    phone: z.string().max(40).optional(),
    address: z.string().max(280).optional(),
  }),
  notes: z.string().max(2000).optional(),
});
export type FlightInput = z.infer<typeof FlightInputSchema>;

export function listFlights(): FlightRecord[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM flights ORDER BY datetime(departure_at) DESC")
    .all() as FlightRow[];
  return rows.map(rowToFlight);
}

export function getFlightById(id: number): FlightRecord | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM flights WHERE id = ?")
    .get(id) as FlightRow | undefined;
  return row ? rowToFlight(row) : null;
}

export function getFlightByTrackingId(
  trackingId: string,
): FlightRecord | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM flights WHERE tracking_id = ?")
    .get(trackingId) as FlightRow | undefined;
  return row ? rowToFlight(row) : null;
}

export function createFlight(input: FlightInput): FlightRecord {
  const db = getDb();
  const trackingId = generateUniqueTrackingId();
  const flightNumber = input.flightNumber?.trim() || generateFlightNumber();
  const stmt = db.prepare(`
    INSERT INTO flights (
      tracking_id, flight_number, aircraft, origin_code, destination_code,
      waypoints_json, cruise_kmh, departure_at, status, is_live,
      cargo_json, shipper_json, consignee_json, notes
    ) VALUES (
      @trackingId, @flightNumber, @aircraft, @originCode, @destinationCode,
      @waypointsJson, @cruiseKmh, @departureAt, @status, @isLive,
      @cargoJson, @shipperJson, @consigneeJson, @notes
    )
  `);
  const info = stmt.run({
    trackingId,
    flightNumber,
    aircraft: input.aircraft,
    originCode: input.originCode.toUpperCase(),
    destinationCode: input.destinationCode.toUpperCase(),
    waypointsJson: JSON.stringify(
      input.waypoints.map((w) => ({ ...w, code: w.code.toUpperCase() })),
    ),
    cruiseKmh: input.cruiseKmh,
    departureAt: input.departureAt,
    status: input.status,
    isLive: input.isLive ? 1 : 0,
    cargoJson: JSON.stringify(input.cargo),
    shipperJson: JSON.stringify(input.shipper),
    consigneeJson: JSON.stringify(input.consignee),
    notes: input.notes ?? null,
  });
  return getFlightById(Number(info.lastInsertRowid))!;
}

export function updateFlight(id: number, input: FlightInput): FlightRecord {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE flights SET
      flight_number = @flightNumber,
      aircraft = @aircraft,
      origin_code = @originCode,
      destination_code = @destinationCode,
      waypoints_json = @waypointsJson,
      cruise_kmh = @cruiseKmh,
      departure_at = @departureAt,
      status = @status,
      is_live = @isLive,
      cargo_json = @cargoJson,
      shipper_json = @shipperJson,
      consignee_json = @consigneeJson,
      notes = @notes,
      updated_at = datetime('now')
    WHERE id = @id
  `);
  stmt.run({
    id,
    flightNumber: input.flightNumber?.trim() || generateFlightNumber(),
    aircraft: input.aircraft,
    originCode: input.originCode.toUpperCase(),
    destinationCode: input.destinationCode.toUpperCase(),
    waypointsJson: JSON.stringify(
      input.waypoints.map((w) => ({ ...w, code: w.code.toUpperCase() })),
    ),
    cruiseKmh: input.cruiseKmh,
    departureAt: input.departureAt,
    status: input.status,
    isLive: input.isLive ? 1 : 0,
    cargoJson: JSON.stringify(input.cargo),
    shipperJson: JSON.stringify(input.shipper),
    consigneeJson: JSON.stringify(input.consignee),
    notes: input.notes ?? null,
  });
  return getFlightById(id)!;
}

export function deleteFlight(id: number) {
  const db = getDb();
  db.prepare("DELETE FROM flights WHERE id = ?").run(id);
}

export function setLive(id: number, isLive: boolean): FlightRecord {
  const db = getDb();
  db.prepare(
    "UPDATE flights SET is_live = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(isLive ? 1 : 0, id);
  return getFlightById(id)!;
}

export function setStatus(id: number, status: FlightStatus): FlightRecord {
  const db = getDb();
  db.prepare(
    "UPDATE flights SET status = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(status, id);
  return getFlightById(id)!;
}

/**
 * Capture the live telemetry of `id` *now* and freeze the flight at that
 * exact location with status='emergency_stop' and the supplied reason.
 */
export function declareEmergency(
  id: number,
  reason: string,
  resumeEta?: string,
): FlightRecord {
  const db = getDb();
  const flight = getFlightById(id);
  if (!flight) throw new Error("Flight not found");

  // Compute current live position. We force isLive=true for the calculation so
  // we always get a real spatial position, even if the operator forgot to flip
  // the live toggle.
  const plan = buildRoutePlan(flight);
  const pos = computeLivePosition(
    { ...flight, isLive: true, status: flight.status === "scheduled" ? "in_flight" : flight.status },
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

  db.prepare(
    `UPDATE flights
        SET status = 'emergency_stop',
            is_live = 1,
            emergency_json = ?,
            updated_at = datetime('now')
      WHERE id = ?`,
  ).run(JSON.stringify(snapshot), id);
  return getFlightById(id)!;
}

/** Clear an emergency hold and resume the previous status (defaults to in_flight). */
export function clearEmergency(
  id: number,
  resumeStatus: FlightStatus = "in_flight",
): FlightRecord {
  const db = getDb();
  db.prepare(
    `UPDATE flights
        SET status = ?,
            emergency_json = NULL,
            updated_at = datetime('now')
      WHERE id = ?`,
  ).run(resumeStatus, id);
  return getFlightById(id)!;
}

function generateUniqueTrackingId(): string {
  const db = getDb();
  const exists = db.prepare("SELECT 1 FROM flights WHERE tracking_id = ?");
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = generateTrackingId();
    if (!exists.get(id)) return id;
  }
  // extremely unlikely fallback
  return generateTrackingId() + "-" + Date.now().toString(36).toUpperCase();
}
