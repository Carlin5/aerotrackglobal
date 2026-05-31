import Link from "next/link";
import {
  Plus,
  Plane,
  Radar,
  Boxes,
  AlertTriangle,
  Radio,
  ShieldCheck,
  Pencil,
} from "lucide-react";
import { listFlights } from "@/lib/flights";
import { buildRoutePlan } from "@/lib/simulation";
import { Panel, PanelHeader, Stat } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { FlightsTable } from "./FlightsTable";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const session = await getSession();
  const operatorName = session?.sub ?? "operator";
  const flights = listFlights();
  const live = flights.filter(
    (f) =>
      f.isLive &&
      f.status !== "delivered" &&
      f.status !== "cancelled" &&
      f.status !== "emergency_stop",
  );
  const emergency = flights.filter((f) => f.status === "emergency_stop");
  const totalDistance = flights.reduce((s, f) => {
    try {
      return s + buildRoutePlan(f).totalDistanceKm;
    } catch {
      return s;
    }
  }, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3">
            Control center
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-0 sm:text-3xl">
            Welcome back, {operatorName}.
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            You have full operational control over every shipment — compose,
            launch, edit, declare emergency holds, or stand them down.
          </p>
        </div>
        <Link href="/admin/flights/new">
          <Button variant="accent" size="md">
            <Plus className="h-4 w-4" /> Compose flight
          </Button>
        </Link>
      </div>

      {/* Operator capability strip */}
      <Panel className="!p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <CapabilityChip
            icon={Plus}
            color="text-cyan-400"
            label="Compose"
            text="Build any multi-leg route"
          />
          <CapabilityChip
            icon={Radio}
            color="text-cyan-400"
            label="Go live"
            text="Toggle realtime broadcast"
          />
          <CapabilityChip
            icon={Pencil}
            color="text-ink-1"
            label="Edit"
            text="Adjust any field anytime"
          />
          <CapabilityChip
            icon={AlertTriangle}
            color="text-signal-red"
            label="Emergency hold"
            text="Freeze a flight at its current position"
          />
          <CapabilityChip
            icon={ShieldCheck}
            color="text-signal-green"
            label="Resume"
            text="Clear an emergency to keep flying"
          />
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel>
          <Plane className="h-4 w-4 text-cyan-400" />
          <div className="mt-3">
            <Stat label="Active flights" value={live.length} tone="cyan" />
          </div>
        </Panel>
        <Panel>
          <Radar className="h-4 w-4 text-cyan-400" />
          <div className="mt-3">
            <Stat label="Total flights" value={flights.length} />
          </div>
        </Panel>
        <Panel>
          <AlertTriangle
            className={
              "h-4 w-4 " +
              (emergency.length > 0 ? "text-signal-red" : "text-cyan-400")
            }
          />
          <div className="mt-3">
            <Stat
              label="Emergency holds"
              value={emergency.length}
              tone={emergency.length > 0 ? ("orange" as const) : undefined}
            />
          </div>
        </Panel>
        <Panel>
          <Boxes className="h-4 w-4 text-cyan-400" />
          <div className="mt-3">
            <Stat
              label="Distance scheduled"
              value={Math.round(totalDistance).toLocaleString()}
              unit="km"
            />
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="All flights"
          subtitle="Compose, edit, toggle live tracking, declare emergency holds, or archive any shipment — all from this table."
        />
        <FlightsTable
          flights={flights.map((f) => {
            let totalDistanceKm = 0;
            let totalFlightMin = 0;
            try {
              const p = buildRoutePlan(f);
              totalDistanceKm = p.totalDistanceKm;
              totalFlightMin = p.totalTripMin;
            } catch {}
            return {
              id: f.id,
              trackingId: f.trackingId,
              flightNumber: f.flightNumber,
              originCode: f.originCode,
              destinationCode: f.destinationCode,
              departureAt: f.departureAt,
              status: f.status,
              isLive: f.isLive,
              hasEmergency: f.status === "emergency_stop" && !!f.emergency,
              cargoDescription: f.cargo.description,
              cargoWeightKg: f.cargo.weightKg,
              totalDistanceKm,
              totalFlightMin,
            };
          })}
        />
      </Panel>
    </div>
  );
}

function CapabilityChip({
  icon: Icon,
  color,
  label,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-bg-1/60 ${color}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="leading-tight">
        <div className="text-[12px] font-semibold tracking-tight text-ink-0">
          {label}
        </div>
        <div className="text-[11px] text-ink-3">{text}</div>
      </div>
    </div>
  );
}
