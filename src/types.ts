export type FlightStatus =
  | "scheduled"
  | "boarding"
  | "in_flight"
  | "landed"
  | "delivered"
  | "delayed"
  | "cancelled"
  | "emergency_stop";

/** Snapshot of telemetry captured the moment an emergency was declared. */
export interface EmergencySnapshot {
  declaredAt: string; // ISO
  reason: string;
  lat: number;
  lng: number;
  bearing: number;
  altitudeM: number;
  groundSpeedKmh: number;
  legIndex: number; // -1 if pre-departure
  segmentProgress: number;
  /** Optional ETA for resumption (ISO). */
  resumeEta?: string;
}

export interface Airport {
  code: string; // IATA
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  tzOffset: number; // hours, simplified
}

export interface Waypoint {
  code: string; // IATA airport
  stopMinutes: number; // ground time at waypoint
}

export interface Cargo {
  description: string;
  weightKg: number;
  pieces: number;
  declaredValueUsd: number;
  hazardous: boolean;
  temperatureControlled: boolean;
  dimensions?: string; // free-form like "120x80x100 cm"
  reference?: string;
}

export interface Party {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface FlightRecord {
  id: number;
  trackingId: string;
  flightNumber: string;
  aircraft: string; // e.g. "Boeing 747-8F"
  originCode: string;
  destinationCode: string;
  waypoints: Waypoint[];
  cruiseKmh: number; // average cruise speed, default 880
  departureAt: string; // ISO; the moment leg 1 actually departs
  status: FlightStatus;
  isLive: boolean; // admin toggles live tracking
  cargo: Cargo;
  shipper: Party;
  consignee: Party;
  notes?: string;
  /** Frozen telemetry snapshot — only populated when status === "emergency_stop". */
  emergency?: EmergencySnapshot;
  createdAt: string;
  updatedAt: string;
}

export interface RouteLeg {
  from: Airport;
  to: Airport;
  distanceKm: number;
  durationMin: number; // flying time only
  departAt: Date;
  arriveAt: Date;
}

export interface RoutePlan {
  legs: RouteLeg[];
  totalDistanceKm: number;
  totalFlightMin: number;
  totalGroundMin: number;
  totalTripMin: number;
  scheduledArrival: Date;
}

export interface LivePosition {
  lat: number;
  lng: number;
  bearing: number; // degrees, 0 = north
  altitudeM: number;
  groundSpeedKmh: number;
  progress: number; // 0..1 across full route
  currentLegIndex: number; // -1 = not started
  segmentProgress: number; // 0..1 within current leg
  state:
    | "scheduled"
    | "boarding"
    | "taxi_out"
    | "climb"
    | "cruise"
    | "descent"
    | "taxi_in"
    | "ground_hold"
    | "landed"
    | "delivered"
    | "emergency";
  remainingMin: number;
  etaAt: Date;
  /** Set when state === "emergency". */
  emergencyReason?: string;
}
