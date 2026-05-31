import { NextResponse } from "next/server";
import { getFlightByTrackingId } from "@/lib/flights";
import {
  buildRoutePlan,
  buildRoutePolyline,
  buildStatusEvents,
  computeLivePosition,
} from "@/lib/simulation";
import { normalizeTrackingId } from "@/lib/tracking-id";

// Public endpoint — returns redacted info safe for clients.
export async function GET(
  _req: Request,
  { params }: { params: { trackingId: string } },
) {
  const id = normalizeTrackingId(params.trackingId);
  const flight = getFlightByTrackingId(id);
  if (!flight)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  let plan;
  let position;
  let polyline;
  let events;
  try {
    plan = buildRoutePlan(flight);
    position = computeLivePosition(flight, plan);
    polyline = buildRoutePolyline(plan, 48);
    events = buildStatusEvents(flight, plan);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Route data unavailable",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    flight: {
      trackingId: flight.trackingId,
      flightNumber: flight.flightNumber,
      aircraft: flight.aircraft,
      status: flight.status,
      isLive: flight.isLive,
      origin: { code: plan.legs[0].from.code, city: plan.legs[0].from.city, country: plan.legs[0].from.country, lat: plan.legs[0].from.lat, lng: plan.legs[0].from.lng },
      destination: {
        code: plan.legs[plan.legs.length - 1].to.code,
        city: plan.legs[plan.legs.length - 1].to.city,
        country: plan.legs[plan.legs.length - 1].to.country,
        lat: plan.legs[plan.legs.length - 1].to.lat,
        lng: plan.legs[plan.legs.length - 1].to.lng,
      },
      waypoints: flight.waypoints,
      cargo: flight.cargo,
      shipper: { name: flight.shipper.name, company: flight.shipper.company },
      consignee: { name: flight.consignee.name, company: flight.consignee.company },
      departureAt: flight.departureAt,
      cruiseKmh: flight.cruiseKmh,
      notes: flight.notes,
      emergency: flight.emergency,
      createdAt: flight.createdAt,
      updatedAt: flight.updatedAt,
    },
    plan: {
      legs: plan.legs.map((l) => ({
        from: { code: l.from.code, city: l.from.city, country: l.from.country, lat: l.from.lat, lng: l.from.lng },
        to: { code: l.to.code, city: l.to.city, country: l.to.country, lat: l.to.lat, lng: l.to.lng },
        distanceKm: l.distanceKm,
        durationMin: l.durationMin,
        departAt: l.departAt.toISOString(),
        arriveAt: l.arriveAt.toISOString(),
      })),
      totalDistanceKm: plan.totalDistanceKm,
      totalFlightMin: plan.totalFlightMin,
      totalGroundMin: plan.totalGroundMin,
      totalTripMin: plan.totalTripMin,
      scheduledArrival: plan.scheduledArrival.toISOString(),
    },
    polyline,
    position,
    events: events.map((e) => ({ ...e, at: e.at.toISOString() })),
    serverTime: new Date().toISOString(),
  });
}
