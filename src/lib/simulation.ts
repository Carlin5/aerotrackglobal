import type {
  FlightRecord,
  LivePosition,
  RouteLeg,
  RoutePlan,
} from "@/types";
import { requireAirport } from "./airports";
import {
  altitudeAt,
  bearingDeg,
  distanceKm,
  groundSpeedAt,
  interpolateGreatCircle,
  legDurationMin,
  phaseAt,
} from "./geo";

/** Build the full route plan with timings for every leg. */
export function buildRoutePlan(flight: FlightRecord): RoutePlan {
  const origin = requireAirport(flight.originCode);
  const destination = requireAirport(flight.destinationCode);
  const stops = flight.waypoints.map((w) => ({
    airport: requireAirport(w.code),
    stopMinutes: Math.max(0, w.stopMinutes),
  }));

  const sequence = [origin, ...stops.map((s) => s.airport), destination];
  const departure = new Date(flight.departureAt);
  let cursor = new Date(departure);
  const legs: RouteLeg[] = [];
  let totalDistance = 0;
  let totalFlight = 0;
  let totalGround = 0;

  for (let i = 0; i < sequence.length - 1; i++) {
    const from = sequence[i];
    const to = sequence[i + 1];
    const dist = distanceKm(from, to);
    const dur = legDurationMin(dist, flight.cruiseKmh);
    const departAt = new Date(cursor);
    const arriveAt = new Date(cursor.getTime() + dur * 60_000);
    legs.push({ from, to, distanceKm: dist, durationMin: dur, departAt, arriveAt });
    totalDistance += dist;
    totalFlight += dur;
    cursor = new Date(arriveAt);
    // Add ground stop if there is a waypoint after this leg
    if (i < stops.length) {
      const stopMin = stops[i].stopMinutes;
      totalGround += stopMin;
      cursor = new Date(cursor.getTime() + stopMin * 60_000);
    }
  }

  return {
    legs,
    totalDistanceKm: totalDistance,
    totalFlightMin: totalFlight,
    totalGroundMin: totalGround,
    totalTripMin: totalFlight + totalGround,
    scheduledArrival: new Date(cursor),
  };
}

/** Sample a polyline along ALL legs for map rendering (great-circle). */
export function buildRoutePolyline(
  plan: RoutePlan,
  samplesPerLeg = 48,
): { lat: number; lng: number }[] {
  const pts: { lat: number; lng: number }[] = [];
  plan.legs.forEach((leg, idx) => {
    for (let i = 0; i <= samplesPerLeg; i++) {
      if (idx > 0 && i === 0) continue; // avoid duplicate join point
      pts.push(interpolateGreatCircle(leg.from, leg.to, i / samplesPerLeg));
    }
  });
  return pts;
}

/** Compute the current live position for the flight at time `now`. */
export function computeLivePosition(
  flight: FlightRecord,
  plan: RoutePlan,
  now: Date = new Date(),
): LivePosition {
  // Emergency stop — freeze at the captured snapshot regardless of clock time.
  if (flight.status === "emergency_stop" && flight.emergency) {
    const e = flight.emergency;
    const tripEnd = plan.scheduledArrival.getTime();
    return {
      lat: e.lat,
      lng: e.lng,
      bearing: e.bearing,
      altitudeM: e.altitudeM,
      groundSpeedKmh: 0, // hold
      progress: Math.max(
        0,
        Math.min(1, distanceCoveredAt(plan, e.legIndex, e.segmentProgress) / plan.totalDistanceKm),
      ),
      currentLegIndex: e.legIndex,
      segmentProgress: e.segmentProgress,
      state: "emergency",
      remainingMin: Math.max(0, (tripEnd - now.getTime()) / 60_000),
      etaAt: e.resumeEta ? new Date(e.resumeEta) : plan.scheduledArrival,
      emergencyReason: e.reason,
    };
  }

  // Not yet live or not departed
  if (!flight.isLive || flight.status === "scheduled" || flight.status === "cancelled") {
    const first = plan.legs[0];
    return {
      lat: first.from.lat,
      lng: first.from.lng,
      bearing: bearingDeg(first.from, first.to),
      altitudeM: 0,
      groundSpeedKmh: 0,
      progress: 0,
      currentLegIndex: -1,
      segmentProgress: 0,
      state: flight.status === "boarding" ? "boarding" : "scheduled",
      remainingMin: plan.totalTripMin,
      etaAt: plan.scheduledArrival,
    };
  }

  // Delivered: park at destination
  if (flight.status === "delivered") {
    const last = plan.legs[plan.legs.length - 1];
    return {
      lat: last.to.lat,
      lng: last.to.lng,
      bearing: 0,
      altitudeM: 0,
      groundSpeedKmh: 0,
      progress: 1,
      currentLegIndex: plan.legs.length - 1,
      segmentProgress: 1,
      state: "delivered",
      remainingMin: 0,
      etaAt: plan.scheduledArrival,
    };
  }

  const tNow = now.getTime();
  // Build a sequential timeline of leg + ground-hold intervals
  const intervals: {
    kind: "leg" | "ground";
    start: number;
    end: number;
    legIndex: number;
  }[] = [];
  let cur = plan.legs[0].departAt.getTime();
  plan.legs.forEach((leg, idx) => {
    const legStart = cur;
    const legEnd = legStart + leg.durationMin * 60_000;
    intervals.push({ kind: "leg", start: legStart, end: legEnd, legIndex: idx });
    cur = legEnd;
    if (idx < plan.legs.length - 1) {
      // ground hold between legs
      const wp = flight.waypoints[idx];
      const stopMin = wp?.stopMinutes ?? 0;
      const gStart = cur;
      const gEnd = gStart + stopMin * 60_000;
      intervals.push({ kind: "ground", start: gStart, end: gEnd, legIndex: idx });
      cur = gEnd;
    }
  });
  const tripEnd = cur;

  // Before first departure (e.g., status=boarding while live)
  if (tNow < intervals[0].start) {
    const first = plan.legs[0];
    return {
      lat: first.from.lat,
      lng: first.from.lng,
      bearing: bearingDeg(first.from, first.to),
      altitudeM: 0,
      groundSpeedKmh: 0,
      progress: 0,
      currentLegIndex: -1,
      segmentProgress: 0,
      state: "boarding",
      remainingMin: Math.max(0, (tripEnd - tNow) / 60_000),
      etaAt: new Date(tripEnd),
    };
  }

  // After arrival but not yet marked delivered: hold at destination
  if (tNow >= tripEnd) {
    const last = plan.legs[plan.legs.length - 1];
    return {
      lat: last.to.lat,
      lng: last.to.lng,
      bearing: 0,
      altitudeM: 0,
      groundSpeedKmh: 0,
      progress: 1,
      currentLegIndex: plan.legs.length - 1,
      segmentProgress: 1,
      state: "landed",
      remainingMin: 0,
      etaAt: new Date(tripEnd),
    };
  }

  // Find the current interval
  const active = intervals.find((iv) => tNow >= iv.start && tNow < iv.end)!;

  // Compute overall progress as flown-distance / total-distance (more meaningful than time)
  // First compute leg-progress for the leg of `active`
  let segmentProgress = 0;
  if (active.kind === "leg") {
    segmentProgress = (tNow - active.start) / (active.end - active.start);
  } else {
    segmentProgress = 1; // ground hold: previous leg complete
  }

  // Distance already covered = sum of distances of fully completed legs +
  // (current leg distance * segmentProgress) if active is a leg.
  let coveredKm = 0;
  for (let i = 0; i < plan.legs.length; i++) {
    const leg = plan.legs[i];
    if (active.kind === "leg" && i < active.legIndex) coveredKm += leg.distanceKm;
    else if (active.kind === "leg" && i === active.legIndex)
      coveredKm += leg.distanceKm * segmentProgress;
    else if (active.kind === "ground" && i <= active.legIndex) coveredKm += leg.distanceKm;
  }
  const progress = Math.min(1, coveredKm / plan.totalDistanceKm);
  const remainingMin = Math.max(0, (tripEnd - tNow) / 60_000);

  if (active.kind === "ground") {
    const leg = plan.legs[active.legIndex];
    return {
      lat: leg.to.lat,
      lng: leg.to.lng,
      bearing: 0,
      altitudeM: 0,
      groundSpeedKmh: 0,
      progress,
      currentLegIndex: active.legIndex,
      segmentProgress: 1,
      state: "ground_hold",
      remainingMin,
      etaAt: new Date(tripEnd),
    };
  }

  const leg = plan.legs[active.legIndex];
  const point = interpolateGreatCircle(leg.from, leg.to, segmentProgress);
  // Bearing: use bearing from current point to destination (more accurate live than from-to)
  const bearing = bearingDeg(point, leg.to);
  return {
    lat: point.lat,
    lng: point.lng,
    bearing,
    altitudeM: altitudeAt(segmentProgress),
    groundSpeedKmh: groundSpeedAt(segmentProgress, flight.cruiseKmh),
    progress,
    currentLegIndex: active.legIndex,
    segmentProgress,
    state: phaseAt(segmentProgress),
    remainingMin,
    etaAt: new Date(tripEnd),
  };
}

/** Sum distance covered up to the given leg/segment-progress. */
function distanceCoveredAt(
  plan: RoutePlan,
  legIndex: number,
  segmentProgress: number,
): number {
  if (legIndex < 0) return 0;
  let km = 0;
  for (let i = 0; i < plan.legs.length; i++) {
    if (i < legIndex) km += plan.legs[i].distanceKm;
    else if (i === legIndex) km += plan.legs[i].distanceKm * Math.max(0, Math.min(1, segmentProgress));
  }
  return km;
}

/** Build a chronological status timeline for the public tracking view. */
export function buildStatusEvents(flight: FlightRecord, plan: RoutePlan) {
  const events: {
    at: Date;
    code:
      | "created"
      | "boarding"
      | "departed"
      | "in_air"
      | "waypoint_landed"
      | "waypoint_departed"
      | "arrived"
      | "delivered"
      | "emergency";
    label: string;
    detail: string;
    location?: string;
  }[] = [];

  events.push({
    at: new Date(flight.createdAt),
    code: "created",
    label: "Shipment created",
    detail: "Cargo documented and accepted at origin facility.",
    location: `${plan.legs[0].from.city} (${plan.legs[0].from.code})`,
  });

  const dep = new Date(flight.departureAt);
  events.push({
    at: new Date(dep.getTime() - 90 * 60_000),
    code: "boarding",
    label: "Cargo loaded",
    detail: `Loaded onto ${flight.aircraft}. Manifest sealed.`,
    location: `${plan.legs[0].from.city} (${plan.legs[0].from.code})`,
  });

  plan.legs.forEach((leg, idx) => {
    events.push({
      at: leg.departAt,
      code: idx === 0 ? "departed" : "waypoint_departed",
      label: idx === 0 ? "Departed origin" : "Departed waypoint",
      detail: `Flight ${flight.flightNumber} departs ${leg.from.code} en route to ${leg.to.code}.`,
      location: `${leg.from.city} (${leg.from.code})`,
    });
    events.push({
      at: leg.arriveAt,
      code: idx === plan.legs.length - 1 ? "arrived" : "waypoint_landed",
      label: idx === plan.legs.length - 1 ? "Arrived at destination" : "Arrived at waypoint",
      detail: `Aircraft landed at ${leg.to.code} after ${Math.round(leg.durationMin)} min flight.`,
      location: `${leg.to.city} (${leg.to.code})`,
    });
  });

  events.push({
    at: new Date(plan.scheduledArrival.getTime() + 75 * 60_000),
    code: "delivered",
    label: "Out for delivery",
    detail: "Cargo cleared customs and is en route to consignee.",
    location: `${plan.legs[plan.legs.length - 1].to.city}`,
  });

  if (flight.status === "emergency_stop" && flight.emergency) {
    events.push({
      at: new Date(flight.emergency.declaredAt),
      code: "emergency",
      label: "Emergency hold declared",
      detail: flight.emergency.reason,
      location: `${flight.emergency.lat.toFixed(2)}°, ${flight.emergency.lng.toFixed(2)}°`,
    });
  }

  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
}
