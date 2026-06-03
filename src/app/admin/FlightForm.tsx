"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Plane,
  MapPin,
  PlusCircle,
  X,
  Save,
  Sparkles,
} from "lucide-react";
import { AIRPORTS } from "@/lib/airports";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Field, FieldRow, Label } from "@/components/ui/Input";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import type { Cargo, FlightRecord, FlightStatus, Party, Waypoint } from "@/types";
import { saveFlight } from "@/lib/hybrid-client";
import { generateTrackingId } from "@/lib/tracking-id";

interface FormState {
  flightNumber: string;
  aircraft: string;
  originCode: string;
  destinationCode: string;
  waypoints: Waypoint[];
  cruiseKmh: number;
  departureAt: string; // YYYY-MM-DDTHH:mm (local-naive, treated as UTC by us)
  status: FlightStatus;
  isLive: boolean;
  cargo: Cargo;
  shipper: Party;
  consignee: Party;
  notes: string;
}

const AIRCRAFTS = [
  "Boeing 747-8F",
  "Boeing 777F",
  "Boeing 767-300F",
  "Airbus A330-200F",
  "Airbus A350F",
  "McDonnell Douglas MD-11F",
  "Boeing 737-800BCF",
  "Antonov An-124",
];

function defaultState(): FormState {
  const dep = new Date();
  dep.setMinutes(0, 0, 0);
  dep.setHours(dep.getHours() + 4);
  return {
    flightNumber: "",
    aircraft: "Boeing 747-8F",
    originCode: "JFK",
    destinationCode: "FRA",
    waypoints: [],
    cruiseKmh: 880,
    departureAt: toLocalDateTimeInput(dep),
    status: "scheduled",
    isLive: false,
    cargo: {
      description: "",
      weightKg: 12000,
      pieces: 24,
      declaredValueUsd: 250000,
      hazardous: false,
      temperatureControlled: false,
      dimensions: "",
      reference: "",
    },
    shipper: { name: "", company: "", email: "", phone: "", address: "" },
    consignee: { name: "", company: "", email: "", phone: "", address: "" },
    notes: "",
  };
}

function toLocalDateTimeInput(d: Date): string {
  // Use ISO and strip seconds + tz, keep UTC-naive for the datetime-local input.
  return d.toISOString().slice(0, 16);
}

export function FlightForm({
  mode,
  flightId,
  initial,
}: {
  mode: "create" | "edit";
  flightId?: number;
  initial?: Partial<FormState>;
}) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() => ({
    ...defaultState(),
    ...initial,
    cargo: { ...defaultState().cargo, ...(initial?.cargo as Cargo) },
    shipper: { ...defaultState().shipper, ...(initial?.shipper as Party) },
    consignee: { ...defaultState().consignee, ...(initial?.consignee as Party) },
    departureAt: initial?.departureAt
      ? toLocalDateTimeInput(new Date(initial.departureAt))
      : defaultState().departureAt,
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ trackingId: string; id: number; localOnly?: boolean } | null>(null);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }
  function patchCargo<K extends keyof Cargo>(key: K, value: Cargo[K]) {
    setState((s) => ({ ...s, cargo: { ...s.cargo, [key]: value } }));
  }
  function patchParty(role: "shipper" | "consignee", patchVal: Partial<Party>) {
    setState((s) => ({ ...s, [role]: { ...s[role], ...patchVal } }));
  }

  function addWaypoint() {
    setState((s) => ({
      ...s,
      waypoints: [...s.waypoints, { code: "DXB", stopMinutes: 90 }],
    }));
  }
  function removeWaypoint(i: number) {
    setState((s) => ({
      ...s,
      waypoints: s.waypoints.filter((_, idx) => idx !== i),
    }));
  }
  function updateWaypoint(i: number, patchVal: Partial<Waypoint>) {
    setState((s) => ({
      ...s,
      waypoints: s.waypoints.map((w, idx) =>
        idx === i ? { ...w, ...patchVal } : w,
      ),
    }));
  }

  const distancePreview = useMemo(() => {
    // Lightweight client-side preview using imported airports
    const codes = [state.originCode, ...state.waypoints.map((w) => w.code), state.destinationCode];
    const pts = codes
      .map((c) => AIRPORTS.find((a) => a.code === c.toUpperCase()))
      .filter(Boolean) as (typeof AIRPORTS)[number][];
    if (pts.length < 2) return null;
    let km = 0;
    for (let i = 0; i < pts.length - 1; i++) km += haversine(pts[i], pts[i + 1]);
    const min = Math.round((km / state.cruiseKmh) * 60) + 35 * (pts.length - 1);
    return { km, min };
  }, [state.originCode, state.destinationCode, state.waypoints, state.cruiseKmh]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const departureAtIso = new Date(state.departureAt + ":00Z").toISOString();
      const nowIso = new Date().toISOString();

      // Build a temporary local record FIRST so a refresh can never kill it.
      // If the API succeeds we overwrite with the real server-generated ID.
      const tempId = mode === "create" ? -(Date.now()) : (flightId ?? -(Date.now()));
      const tempFlight: FlightRecord = {
        id: tempId,
        trackingId: generateTrackingId(),
        flightNumber: state.flightNumber,
        aircraft: state.aircraft,
        originCode: state.originCode,
        destinationCode: state.destinationCode,
        waypoints: state.waypoints,
        cruiseKmh: state.cruiseKmh,
        departureAt: departureAtIso,
        status: state.status,
        isLive: state.isLive,
        cargo: state.cargo,
        shipper: state.shipper,
        consignee: state.consignee,
        notes: state.notes || undefined,
        emergency: undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      // Step A — Persist locally BEFORE touching the network
      await saveFlight(tempFlight);
      console.log("[FlightForm] Pre-API local backup done:", tempFlight.trackingId);

      // Step B — Send to API / Supabase
      const payload = {
        ...state,
        departureAt: departureAtIso,
      };
      const res = await fetch(
        mode === "create" ? "/api/flights" : `/api/flights/${flightId}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      console.log('[FlightForm] Response status:', res.status);
      const rawText = await res.text();
      console.log('[FlightForm] Response body:', rawText.slice(0, 1000));
      let j: { error?: string; detail?: string; debug?: string; flight?: FlightRecord } = {};
      try { j = JSON.parse(rawText); } catch { /* not JSON */ }
      if (!res.ok) {
        const msg = j.detail || j.error || `Save failed (${res.status})`;
        const dbg = j.debug ? `\n(Debug: ${j.debug})` : '';
        setError(msg + dbg + "\n(Flight was saved to localStorage — it will survive refreshes.)");
        // Even though Supabase failed, the flight IS in localStorage.
        // Show the success screen so the user gets their tracking ID.
        if (mode === "create") {
          setCreated({ id: tempFlight.id, trackingId: tempFlight.trackingId, localOnly: true });
        }
        setBusy(false);
        return;
      }
      if (j.flight) {
        // Overwrite the temporary local record with the real server one
        await saveFlight(j.flight);
        console.log("[FlightForm] Server flight synced to localStorage:", j.flight.trackingId);
      }
      if (mode === "create" && j.flight) {
        setCreated({ id: j.flight.id, trackingId: j.flight.trackingId });
      } else {
        router.push("/admin");
        router.refresh();
      }
    } catch {
      setError("Network error — check your connection.");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <Panel strong>
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 text-cyan-400" />
          <div className="w-full">
            <h2 className="text-xl font-semibold tracking-tight text-ink-0">
              Flight created
            </h2>
            {created.localOnly && (
              <div className="mt-2 rounded-lg border border-signal-amber/30 bg-signal-amber/10 p-3 text-sm text-signal-amber">
                <strong>Local-only mode:</strong> Supabase is unavailable, so this
                flight is stored in your browser only. It will survive page
                refreshes on this device, but won&apos;t sync to other devices
                until the database is fixed.
              </div>
            )}
            <p className="mt-2 text-sm text-ink-2">
              Share this tracking ID with your client. Toggle &quot;Go live&quot; from
              the mission board to start broadcasting realtime position.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 font-mono text-base text-cyan-400 shadow-glow">
              {created.trackingId}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/track/${encodeURIComponent(created.trackingId)}`} target="_blank">
                <Button variant="primary">Open public tracking page</Button>
              </Link>
              <Link href={`/admin/flights/${created.id}/edit`}>
                <Button variant="ghost">Continue editing</Button>
              </Link>
              <Link href="/admin">
                <Button variant="outline">Back to mission board</Button>
              </Link>
            </div>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Panel>
        <PanelHeader
          title="Route"
          subtitle="Pick origin & destination. Add unlimited midway waypoints; each can have ground time."
          action={
            distancePreview ? (
              <Badge tone="cyan">
                {Math.round(distancePreview.km).toLocaleString()} km ·{" "}
                {Math.round(distancePreview.min / 60)}h{" "}
                {distancePreview.min % 60}m
              </Badge>
            ) : null
          }
        />
        <FieldRow cols={3}>
          <Field label="Origin (IATA)">
            <AirportSelect
              value={state.originCode}
              onChange={(v) => patch("originCode", v)}
            />
          </Field>
          <Field label="Destination (IATA)">
            <AirportSelect
              value={state.destinationCode}
              onChange={(v) => patch("destinationCode", v)}
            />
          </Field>
          <Field label="Cruise speed" hint="km/h">
            <Input
              type="number"
              min={400}
              max={1200}
              value={state.cruiseKmh}
              onChange={(e) => patch("cruiseKmh", Number(e.target.value))}
            />
          </Field>
        </FieldRow>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <Label>Midway waypoints</Label>
            <Button type="button" variant="ghost" size="sm" onClick={addWaypoint}>
              <PlusCircle className="h-3.5 w-3.5" /> Add waypoint
            </Button>
          </div>
          {state.waypoints.length === 0 ? (
            <p className="text-xs text-ink-3">
              No waypoints — this is a direct flight from origin to destination.
            </p>
          ) : (
            <ol className="space-y-2">
              {state.waypoints.map((w, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-bg-1/40 p-3"
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">
                    Stop {i + 1}
                  </div>
                  <div className="min-w-[220px] flex-1">
                    <Label>Airport</Label>
                    <AirportSelect
                      value={w.code}
                      onChange={(v) => updateWaypoint(i, { code: v })}
                    />
                  </div>
                  <div className="w-[160px]">
                    <Label hint="min">Ground time</Label>
                    <Input
                      type="number"
                      min={0}
                      max={2880}
                      value={w.stopMinutes}
                      onChange={(e) =>
                        updateWaypoint(i, {
                          stopMinutes: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeWaypoint(i)}
                  >
                    <X className="h-3.5 w-3.5 text-signal-red" /> Remove
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Flight"
          subtitle="Aircraft, schedule, and live status."
        />
        <FieldRow cols={3}>
          <Field label="Flight number" hint="Auto if blank">
            <Input
              placeholder="AT4421"
              value={state.flightNumber}
              onChange={(e) => patch("flightNumber", e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Aircraft">
            <Select
              value={state.aircraft}
              onChange={(e) => patch("aircraft", e.target.value)}
            >
              {AIRCRAFTS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Departure" hint="UTC">
            <Input
              type="datetime-local"
              value={state.departureAt}
              onChange={(e) => patch("departureAt", e.target.value)}
            />
          </Field>
        </FieldRow>
        <FieldRow cols={3}>
          <Field label="Status">
            <Select
              value={state.status}
              onChange={(e) =>
                patch("status", e.target.value as FlightStatus)
              }
            >
              <option value="scheduled">scheduled</option>
              <option value="boarding">boarding</option>
              <option value="in_flight">in_flight</option>
              <option value="landed">landed</option>
              <option value="delivered">delivered</option>
              <option value="delayed">delayed</option>
              <option value="cancelled">cancelled</option>
            </Select>
          </Field>
          <Field label="Live broadcast">
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-line bg-bg-1/70 px-3 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-cyan-500"
                checked={state.isLive}
                onChange={(e) => patch("isLive", e.target.checked)}
              />
              <span className="text-ink-1">
                Broadcast realtime position to public tracking page
              </span>
            </label>
          </Field>
        </FieldRow>
      </Panel>

      <Panel>
        <PanelHeader title="Cargo manifest" />
        <Field label="Description">
          <Textarea
            placeholder="e.g. Lithium-ion battery cells, palletised, UN3480 PI965"
            value={state.cargo.description}
            onChange={(e) => patchCargo("description", e.target.value)}
            required
          />
        </Field>
        <div className="mt-4">
          <FieldRow cols={4}>
            <Field label="Pieces">
              <Input
                type="number"
                min={1}
                value={state.cargo.pieces}
                onChange={(e) => patchCargo("pieces", Number(e.target.value))}
              />
            </Field>
            <Field label="Weight (kg)">
              <Input
                type="number"
                min={0}
                step={0.1}
                value={state.cargo.weightKg}
                onChange={(e) => patchCargo("weightKg", Number(e.target.value))}
              />
            </Field>
            <Field label="Declared value (USD)">
              <Input
                type="number"
                min={0}
                value={state.cargo.declaredValueUsd}
                onChange={(e) =>
                  patchCargo("declaredValueUsd", Number(e.target.value))
                }
              />
            </Field>
            <Field label="Reference" hint="opt.">
              <Input
                value={state.cargo.reference || ""}
                onChange={(e) => patchCargo("reference", e.target.value)}
                placeholder="HBL12345"
              />
            </Field>
          </FieldRow>
        </div>
        <div className="mt-4">
          <FieldRow cols={2}>
            <Field label="Dimensions" hint="opt.">
              <Input
                value={state.cargo.dimensions || ""}
                onChange={(e) => patchCargo("dimensions", e.target.value)}
                placeholder="120 × 80 × 100 cm"
              />
            </Field>
            <Field label="Handling flags">
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-cyan-500"
                    checked={state.cargo.hazardous}
                    onChange={(e) => patchCargo("hazardous", e.target.checked)}
                  />
                  <span className="text-ink-1">Hazardous (DG)</span>
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-cyan-500"
                    checked={state.cargo.temperatureControlled}
                    onChange={(e) =>
                      patchCargo("temperatureControlled", e.target.checked)
                    }
                  />
                  <span className="text-ink-1">Temperature controlled</span>
                </label>
              </div>
            </Field>
          </FieldRow>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <PartyForm
          title="Shipper"
          value={state.shipper}
          onChange={(p) => patchParty("shipper", p)}
        />
        <PartyForm
          title="Consignee"
          value={state.consignee}
          onChange={(p) => patchParty("consignee", p)}
        />
      </div>

      <Panel>
        <PanelHeader title="Operator notes" subtitle="Visible on the public tracking page." />
        <Textarea
          value={state.notes}
          onChange={(e) => patch("notes", e.target.value)}
          placeholder="Customs cleared at origin. Handle with care."
        />
      </Panel>

      {error ? (
        <div className="rounded-md border border-signal-red/40 bg-signal-red/10 px-3 py-2 text-xs text-signal-red">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Link href="/admin">
          <Button type="button" variant="ghost">
            <ArrowLeft className="h-4 w-4" /> Cancel
          </Button>
        </Link>
        <Button type="submit" variant="accent" size="lg" disabled={busy}>
          <Save className="h-4 w-4" />
          {busy
            ? "Saving…"
            : mode === "create"
              ? "Create flight & generate tracking ID"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function PartyForm({
  title,
  value,
  onChange,
}: {
  title: string;
  value: Party;
  onChange: (p: Partial<Party>) => void;
}) {
  return (
    <Panel>
      <PanelHeader title={title} />
      <FieldRow cols={2}>
        <Field label="Contact name">
          <Input
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            required
          />
        </Field>
        <Field label="Company" hint="opt.">
          <Input
            value={value.company || ""}
            onChange={(e) => onChange({ company: e.target.value })}
          />
        </Field>
        <Field label="Email" hint="opt.">
          <Input
            type="email"
            value={value.email || ""}
            onChange={(e) => onChange({ email: e.target.value })}
          />
        </Field>
        <Field label="Phone" hint="opt.">
          <Input
            value={value.phone || ""}
            onChange={(e) => onChange({ phone: e.target.value })}
          />
        </Field>
      </FieldRow>
      <div className="mt-4">
        <Field label="Address" hint="opt.">
          <Textarea
            value={value.address || ""}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="Street, City, Country"
          />
        </Field>
      </div>
    </Panel>
  );
}

function AirportSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value.toUpperCase())}
    >
      {AIRPORTS.map((a) => (
        <option key={a.code} value={a.code}>
          {a.code} · {a.city}, {a.country}
        </option>
      ))}
    </Select>
  );
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371.0088;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dφ = toR(b.lat - a.lat);
  const dλ = toR(b.lng - a.lng);
  const s =
    Math.sin(dφ / 2) ** 2 +
    Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dλ / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
