import { FlightForm } from "../../FlightForm";

export default function NewFlightPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3">
          New mission
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-0 sm:text-3xl">
          Compose flight
        </h1>
        <p className="mt-1 text-sm text-ink-2">
          Define origin, optional midway waypoints, destination, aircraft and
          full cargo manifest. Save to generate a unique tracking ID.
        </p>
      </div>
      <FlightForm mode="create" />
    </div>
  );
}
