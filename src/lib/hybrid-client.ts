"use client";

import { createClient } from "@supabase/supabase-js";
import type { FlightRecord } from "@/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Lazy-init the client so we don't crash if env vars are missing
let _client: ReturnType<typeof createClient> | null = null;
function getClient() {
  if (!_client && SUPABASE_URL && SUPABASE_ANON_KEY) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _client;
}

const LOCAL_LIST_KEY = "aerotrack_local_flights";

/** Read the in-browser flight list from localStorage */
function getLocalList(): FlightRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_LIST_KEY);
    return raw ? (JSON.parse(raw) as FlightRecord[]) : [];
  } catch {
    return [];
  }
}

/** Write the in-browser flight list to localStorage */
function setLocalList(flights: FlightRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_LIST_KEY, JSON.stringify(flights));
  } catch {
    /* ignore quota errors */
  }
}

/** Save a single flight into the local list (upsert by id) */
function saveLocalFlight(flight: FlightRecord) {
  const list = getLocalList();
  const idx = list.findIndex((f) => f.id === flight.id);
  if (idx >= 0) {
    list[idx] = flight;
  } else {
    list.push(flight);
  }
  setLocalList(list);
}

/**
 * 1. FAILSAFE SAVE
 *    Dual-write: localStorage first (instant), then Supabase.
 *    If Supabase fails, the local copy is already there.
 */
export async function saveFlight(
  flightData: FlightRecord,
): Promise<FlightRecord> {
  // Step A — Instant local backup
  try {
    saveLocalFlight(flightData);
    console.log("[hybrid] Flight backed up locally:", flightData.trackingId);
  } catch (localErr) {
    console.error("[hybrid] Local storage backup failed:", localErr);
  }

  // Step B — Send to Supabase (only if client is available)
  const client = getClient();
  if (client) {
    try {
      const { error } = await (client as any)
        .from("flights")
        .upsert(
          [
            {
              id: flightData.id,
              tracking_id: flightData.trackingId,
              flight_number: flightData.flightNumber,
              aircraft: flightData.aircraft,
              origin_code: flightData.originCode,
              destination_code: flightData.destinationCode,
              waypoints_json: JSON.stringify(flightData.waypoints),
              cruise_kmh: flightData.cruiseKmh,
              departure_at: flightData.departureAt,
              status: flightData.status,
              is_live: flightData.isLive,
              cargo_json: JSON.stringify(flightData.cargo),
              shipper_json: JSON.stringify(flightData.shipper),
              consignee_json: JSON.stringify(flightData.consignee),
              notes: flightData.notes ?? null,
              emergency_json: flightData.emergency
                ? JSON.stringify(flightData.emergency)
                : null,
              created_at: flightData.createdAt,
              updated_at: flightData.updatedAt,
            },
          ],
          { onConflict: "id" },
        );

      if (error) throw error;
      console.log("[hybrid] Flight synced to Supabase:", flightData.trackingId);
    } catch (dbError) {
      console.error(
        "[hybrid] Supabase save failed, relying on local backup:",
        dbError,
      );
    }
  }

  // Always return the data so the app never stalls
  return flightData;
}

/**
 * 2. FAILSAFE LOAD by ID
 *    Try Supabase first. On any failure, immediately fall back to localStorage.
 */
export async function loadFlightById(
  flightId: number,
): Promise<FlightRecord | null> {
  const client = getClient();

  // Step A — Try Supabase
  if (client) {
    try {
      const { data, error } = await client
        .from("flights")
        .select("*")
        .eq("id", flightId)
        .single();

      if (data && !error) {
        const flight = rowToFlight(data);
        saveLocalFlight(flight); // refresh local cache
        return flight;
      }
    } catch (err) {
      console.warn("[hybrid] Supabase load failed:", err);
    }
  }

  // Step B — Fallback to localStorage
  const local = getLocalList().find((f) => f.id === flightId);
  if (local) {
    console.log("[hybrid] Restored flight from local storage:", flightId);
    return local;
  }

  console.error("[hybrid] No online or local data found for flight:", flightId);
  return null;
}

/**
 * 2b. FAILSAFE LOAD by trackingId
 *    Same pattern: Supabase first, then localStorage.
 */
export async function loadFlightByTrackingId(
  trackingId: string,
): Promise<FlightRecord | null> {
  const client = getClient();

  if (client) {
    try {
      const { data, error } = await client
        .from("flights")
        .select("*")
        .eq("tracking_id", trackingId)
        .single();

      if (data && !error) {
        const flight = rowToFlight(data);
        saveLocalFlight(flight);
        return flight;
      }
    } catch (err) {
      console.warn("[hybrid] Supabase tracking lookup failed:", err);
    }
  }

  // Fallback
  const local = getLocalList().find(
    (f) => f.trackingId.toLowerCase() === trackingId.toLowerCase(),
  );
  if (local) {
    console.log(
      "[hybrid] Restored flight from local storage:",
      trackingId,
    );
    return local;
  }

  return null;
}

/**
 * 3. FAILSAFE LIST
 *    Merge Supabase results with localStorage flights.
 *    If Supabase is down, return pure local list.
 */
export async function listFlightsHybrid(): Promise<FlightRecord[]> {
  const client = getClient();
  let remote: FlightRecord[] = [];

  if (client) {
    try {
      const { data, error } = await client
        .from("flights")
        .select("*")
        .order("departure_at", { ascending: false });

      if (!error && data) {
        remote = data.map(rowToFlight);
        // Sync every successful remote read into local cache
        setLocalList(remote);
      }
    } catch (err) {
      console.warn("[hybrid] Supabase list failed, using local cache:", err);
    }
  }

  // If remote succeeded, we already cached it → return it.
  // If remote failed, return the last-known local list.
  if (remote.length > 0) return remote;
  return getLocalList();
}

/**
 * 4. DELETE (local + remote)
 */
export async function deleteFlightHybrid(id: number): Promise<void> {
  // Remove from localStorage immediately
  const filtered = getLocalList().filter((f) => f.id !== id);
  setLocalList(filtered);

  // Attempt remote delete
  const client = getClient();
  if (client) {
    try {
      const { error } = await client.from("flights").delete().eq("id", id);
      if (error) throw error;
    } catch (err) {
      console.warn("[hybrid] Remote delete failed (local already removed):", err);
    }
  }
}

/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */

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
  status: string;
  is_live: boolean;
  cargo_json: string;
  shipper_json: string;
  consignee_json: string;
  notes: string | null;
  emergency_json: string | null;
  created_at: string;
  updated_at: string;
}

function rowToFlight(row: FlightRow): FlightRecord {
  return {
    id: row.id,
    trackingId: row.tracking_id,
    flightNumber: row.flight_number,
    aircraft: row.aircraft,
    originCode: row.origin_code,
    destinationCode: row.destination_code,
    waypoints: JSON.parse(row.waypoints_json),
    cruiseKmh: row.cruise_kmh,
    departureAt: row.departure_at,
    status: row.status as FlightRecord["status"],
    isLive: row.is_live,
    cargo: JSON.parse(row.cargo_json),
    shipper: JSON.parse(row.shipper_json),
    consignee: JSON.parse(row.consignee_json),
    notes: row.notes ?? undefined,
    emergency: row.emergency_json
      ? JSON.parse(row.emergency_json)
      : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
