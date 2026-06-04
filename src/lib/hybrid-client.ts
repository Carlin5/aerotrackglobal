"use client";

import { createClient } from "@supabase/supabase-js";
import { buildRoutePlan, computeLivePosition } from "@/lib/simulation";
import type { EmergencySnapshot, FlightRecord, FlightStatus } from "@/types";

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
 *    Local-only flights (negative IDs or not in remote) are preserved.
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
      }
    } catch (err) {
      console.warn("[hybrid] Supabase list failed, using local cache:", err);
    }
  }

  if (remote.length > 0) {
    // Merge remote flights with local-only flights so they don't get wiped
    const local = getLocalList();
    const remoteIds = new Set(remote.map((f) => f.id));
    const localOnly = local.filter((f) => !remoteIds.has(f.id));
    const merged = [...remote, ...localOnly];
    setLocalList(merged);
    return merged;
  }

  // If remote failed, return the last-known local list.
  return getLocalList();
}

/**
 * 4. EMERGENCY declare/clear (local + remote)
 */
export async function declareEmergencyHybrid(
  id: number,
  reason: string,
  resumeEta?: string,
): Promise<FlightRecord> {
  const flight = getLocalList().find((f) => f.id === id);
  if (!flight) throw new Error("Flight not found in localStorage");

  const plan = buildRoutePlan(flight);
  const pos = computeLivePosition(
    {
      ...flight,
      isLive: true,
      status: flight.status === "scheduled" ? "in_flight" : flight.status,
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

  const updated: FlightRecord = {
    ...flight,
    status: "emergency_stop",
    isLive: true,
    emergency: snapshot,
    updatedAt: new Date().toISOString(),
  };

  saveLocalFlight(updated);

  // Also attempt remote update
  const client = getClient();
  if (client) {
    try {
      await (client as any)
        .from("flights")
        .update({
          status: "emergency_stop",
          is_live: true,
          emergency_json: JSON.stringify(snapshot),
          updated_at: updated.updatedAt,
        })
        .eq("id", id);
    } catch {
      /* ignore remote failures for local-only flights */
    }
  }

  return updated;
}

export async function clearEmergencyHybrid(
  id: number,
  resumeStatus: FlightStatus = "in_flight",
): Promise<FlightRecord> {
  const flight = getLocalList().find((f) => f.id === id);
  if (!flight) throw new Error("Flight not found in localStorage");

  const updated: FlightRecord = {
    ...flight,
    status: resumeStatus,
    emergency: undefined,
    updatedAt: new Date().toISOString(),
  };

  saveLocalFlight(updated);

  // Also attempt remote update
  const client = getClient();
  if (client) {
    try {
      await (client as any)
        .from("flights")
        .update({
          status: resumeStatus,
          emergency_json: null,
          updated_at: updated.updatedAt,
        })
        .eq("id", id);
    } catch {
      /* ignore remote failures */
    }
  }

  return updated;
}

/**
 * 5. SYNC local-only flights to Supabase
 * Uploads all localStorage flights with negative IDs to the database
 * Returns the number of flights synced
 */
export async function syncLocalFlightsToSupabase(): Promise<number> {
  const client = getClient();
  if (!client) return 0;

  const localFlights = getLocalList().filter((f) => f.id < 0);
  if (localFlights.length === 0) return 0;

  let synced = 0;
  for (const flight of localFlights) {
    try {
      // Prepare payload for the API
      const payload = {
        trackingId: flight.trackingId,
        flightNumber: flight.flightNumber,
        aircraft: flight.aircraft,
        originCode: flight.originCode,
        destinationCode: flight.destinationCode,
        waypoints: flight.waypoints,
        cruiseKmh: flight.cruiseKmh,
        departureAt: flight.departureAt,
        status: flight.status,
        isLive: flight.isLive,
        cargo: flight.cargo,
        shipper: flight.shipper,
        consignee: flight.consignee,
        notes: flight.notes,
      };

      const res = await fetch("/api/flights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const j = await res.json();
        if (j.flight) {
          // Remove the local-only version and save the server version
          deleteFlightHybrid(flight.id);
          saveFlight(j.flight);
          synced++;
          console.log("[sync] Synced local flight to Supabase:", flight.trackingId);
        }
      }
    } catch (err) {
      console.warn("[sync] Failed to sync flight:", flight.trackingId, err);
    }
  }

  return synced;
}

/**
 * 6. DELETE (local + remote)
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
