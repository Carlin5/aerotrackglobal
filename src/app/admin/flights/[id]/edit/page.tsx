import { notFound } from "next/navigation";
import { getFlightById } from "@/lib/flights";
import { FlightForm } from "../../../FlightForm";

export const dynamic = "force-dynamic";

export default async function EditFlightPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const flight = await getFlightById(id);
  if (!flight) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3">
          Edit mission
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-0 sm:text-3xl">
          {flight.flightNumber} ·{" "}
          <span className="text-ink-2">{flight.originCode} → {flight.destinationCode}</span>
        </h1>
        <p className="mt-1 font-mono text-xs text-ink-3">
          Tracking ID: <span className="text-ink-1">{flight.trackingId}</span>
        </p>
      </div>
      <FlightForm
        mode="edit"
        flightId={flight.id}
        initial={{
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
          notes: flight.notes ?? "",
        }}
      />
    </div>
  );
}
