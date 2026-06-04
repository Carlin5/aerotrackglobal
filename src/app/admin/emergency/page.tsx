"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Pencil,
  Trash2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Search,
  X,
  Link as LinkIcon,
  Check,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Panel, PanelHeader, Stat } from "@/components/ui/Panel";
import { listFlightsHybrid, deleteFlightHybrid } from "@/lib/hybrid-client";
import type { FlightRecord } from "@/types";
import { EmergencyDialog } from "../EmergencyDialog";
import { DeleteFlightDialog } from "../DeleteFlightDialog";
import { formatDistanceKm, formatDuration, cn } from "@/lib/utils";
import { buildRoutePlan } from "@/lib/simulation";

function flightToRow(f: FlightRecord) {
  let totalDistanceKm = 0;
  let totalFlightMin = 0;
  try {
    const p = buildRoutePlan(f);
    totalDistanceKm = p.totalDistanceKm;
    totalFlightMin = p.totalTripMin;
  } catch { /* ignore */ }
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
    emergencyReason: f.emergency?.reason,
    emergencyDeclaredAt: f.emergency?.declaredAt,
    localOnly: f.id < 0,
  };
}

type Row = ReturnType<typeof flightToRow>;

export default function EmergencyPage() {
  const router = useRouter();
  const [flights, setFlights] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [banner, setBanner] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);

  const [emergencyDialog, setEmergencyDialog] = useState<{
    open: boolean;
    flight: Row | null;
    mode: "declare" | "clear";
  }>({ open: false, flight: null, mode: "declare" });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    flight: Row | null;
    busy: boolean;
    error: string | null;
  }>({ open: false, flight: null, busy: false, error: null });

  useEffect(() => {
    listFlightsHybrid()
      .then((all) => {
        const emergency = all
          .filter((f) => f.status === "emergency_stop")
          .map(flightToRow);
        setFlights(emergency);
      })
      .catch(() => {
        setBanner({ tone: "error", text: "Failed to load flights." });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  useEffect(() => {
    if (copiedId == null) return;
    const t = setTimeout(() => setCopiedId(null), 1500);
    return () => clearTimeout(t);
  }, [copiedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return flights;
    return flights.filter(
      (f) =>
        f.trackingId.toLowerCase().includes(q) ||
        f.flightNumber.toLowerCase().includes(q) ||
        f.originCode.toLowerCase().includes(q) ||
        f.destinationCode.toLowerCase().includes(q) ||
        f.cargoDescription.toLowerCase().includes(q) ||
        f.emergencyReason?.toLowerCase().includes(q),
    );
  }, [flights, query]);

  async function confirmDelete() {
    const row = deleteDialog.flight;
    if (!row) return;
    setDeleteDialog((d) => ({ ...d, busy: true, error: null }));
    try {
      if (row.localOnly) {
        // Local-only flight: just delete from localStorage
        await deleteFlightHybrid(row.id);
      } else {
        const res = await fetch(`/api/flights/${row.id}`, { method: "DELETE" });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          setDeleteDialog((d) => ({
            ...d,
            busy: false,
            error: j.error || `Delete failed (${res.status}).`,
          }));
          return;
        }
      }
      setBanner({
        tone: "success",
        text: `Flight ${row.flightNumber} (${row.trackingId}) deleted.`,
      });
      setDeleteDialog({ open: false, flight: null, busy: false, error: null });
      // Refresh list
      const all = await listFlightsHybrid();
      setFlights(
        all.filter((f) => f.status === "emergency_stop").map(flightToRow),
      );
    } catch {
      setDeleteDialog((d) => ({
        ...d,
        busy: false,
        error: "Network error — please retry.",
      }));
    }
  }

  async function copyPublicLink(row: Row) {
    const url = `${window.location.origin}/track/${encodeURIComponent(row.trackingId)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(row.id);
    } catch {
      setBanner({
        tone: "error",
        text: "Could not access clipboard.",
      });
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-8 w-8 animate-pulse text-signal-red" />
            <p className="mt-3 text-sm text-ink-2">Loading emergency holds…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3">
            Crisis control
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-0 sm:text-3xl">
            Emergency holds
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            Every flight currently under emergency stop. Clear, edit, or archive
            them from this command center.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="outline" size="md">
              Back to mission board
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel>
          <AlertTriangle className="h-4 w-4 text-signal-red" />
          <div className="mt-3">
            <Stat
              label="Active holds"
              value={flights.length}
              tone={flights.length > 0 ? "orange" : undefined}
            />
          </div>
        </Panel>
        <Panel>
          <Radio className="h-4 w-4 text-cyan-400" />
          <div className="mt-3">
            <Stat
              label="Broadcasting"
              value={flights.filter((f) => f.isLive).length}
              tone="cyan"
            />
          </div>
        </Panel>
        <Panel>
          <ShieldCheck className="h-4 w-4 text-signal-green" />
          <div className="mt-3">
            <Stat
              label="Ready to resume"
              value={flights.filter((f) => f.isLive).length}
              tone="green"
            />
          </div>
        </Panel>
        <Panel>
          <LinkIcon className="h-4 w-4 text-ink-1" />
          <div className="mt-3">
            <Stat
              label="Tracking IDs"
              value={flights.length}
            />
          </div>
        </Panel>
      </div>

      {banner ? (
        <div
          role="status"
          className={cn(
            "flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-xs",
            banner.tone === "error"
              ? "border-signal-red/40 bg-signal-red/10 text-signal-red"
              : "border-signal-green/40 bg-signal-green/10 text-signal-green",
          )}
        >
          <span className="leading-relaxed">{banner.text}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setBanner(null)}
            className="shrink-0 rounded p-0.5 hover:bg-white/[0.06] cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <Panel>
        <PanelHeader
          title="Emergency flights"
          subtitle="All flights currently under emergency stop. Use the actions to resolve or manage each incident."
        />

        {flights.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-bg-1/40 p-10 text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3">
              No active emergencies
            </div>
            <p className="mt-2 text-sm text-ink-2">
              All flights are operating normally. Emergency holds will appear
              here when declared.
            </p>
            <div className="mt-4 flex justify-center">
              <Link href="/admin">
                <Button variant="accent">Return to mission board</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tracking, flight, reason…"
                className="pl-9 pr-9"
                aria-label="Search emergency flights"
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-3 hover:bg-white/[0.06] hover:text-ink-0 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line bg-bg-1/40 p-8 text-center">
                <p className="text-sm text-ink-2">
                  No flights match &quot;<span className="text-ink-0">{query}</span>&quot;.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-wider text-ink-3">
                      <th className="py-2 pr-3">Tracking</th>
                      <th className="py-2 pr-3">Flight</th>
                      <th className="py-2 pr-3">Route</th>
                      <th className="py-2 pr-3">Emergency reason</th>
                      <th className="py-2 pr-3">Declared</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((f) => (
                      <tr
                        key={f.id}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-3 pr-3 font-mono text-xs text-ink-0">
                          {f.trackingId}
                          {f.localOnly && (
                            <Badge tone="amber" className="ml-1.5 text-[9px]">
                              Local
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 pr-3">
                          <div className="font-mono text-xs text-ink-0">
                            {f.flightNumber}
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="font-mono text-xs text-ink-1">
                            {f.originCode} → {f.destinationCode}
                          </div>
                          <div className="font-mono text-[11px] text-ink-3">
                            {formatDistanceKm(f.totalDistanceKm)} ·{" "}
                            {formatDuration(f.totalFlightMin)}
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="max-w-[280px] text-sm text-ink-0">
                            {f.emergencyReason || "—"}
                          </div>
                        </td>
                        <td className="py-3 pr-3 font-mono text-xs text-ink-2">
                          {f.emergencyDeclaredAt
                            ? new Date(f.emergencyDeclaredAt)
                                .toISOString()
                                .slice(0, 16)
                                .replace("T", " ")
                            : "—"}
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex flex-col items-start gap-1">
                            <Badge tone="red" dot pulse>
                              <AlertTriangle className="h-3 w-3" /> Hold
                            </Badge>
                            {f.isLive && (
                              <Badge tone="cyan" dot pulse>
                                Live
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => copyPublicLink(f)}
                              title="Copy public tracking link"
                            >
                              {copiedId === f.id ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-signal-green" />{" "}
                                  Copied
                                </>
                              ) : (
                                <>
                                  <LinkIcon className="h-3.5 w-3.5" /> Copy
                                </>
                              )}
                            </Button>
                            <Link
                              href={`/track/${encodeURIComponent(f.trackingId)}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Open public tracking page"
                            >
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-3.5 w-3.5" /> Public
                              </Button>
                            </Link>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() =>
                                setEmergencyDialog({
                                  open: true,
                                  flight: f,
                                  mode: "clear",
                                })
                              }
                              title="Clear emergency and resume flight"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" /> Resume
                            </Button>
                            <Link
                              href={`/admin/flights/${f.id}/edit`}
                              title="Edit flight"
                            >
                              <Button variant="ghost" size="sm">
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setDeleteDialog({
                                  open: true,
                                  flight: f,
                                  busy: false,
                                  error: null,
                                })
                              }
                              title="Delete flight"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-signal-red" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Panel>

      <EmergencyDialog
        open={emergencyDialog.open}
        flight={emergencyDialog.flight}
        mode={emergencyDialog.mode}
        onClose={() =>
          setEmergencyDialog((d) => ({ ...d, open: false }))
        }
        onDone={async () => {
          setBanner({
            tone: "success",
            text: "Emergency cleared — flight resumed.",
          });
          startTransition(() => router.refresh());
          // Refresh list
          const all = await listFlightsHybrid();
          setFlights(
            all.filter((f) => f.status === "emergency_stop").map(flightToRow),
          );
        }}
      />

      <DeleteFlightDialog
        open={deleteDialog.open}
        flight={deleteDialog.flight}
        busy={deleteDialog.busy}
        error={deleteDialog.error}
        onClose={() =>
          deleteDialog.busy
            ? undefined
            : setDeleteDialog({
                open: false,
                flight: null,
                busy: false,
                error: null,
              })
        }
        onConfirm={confirmDelete}
      />
    </div>
  );
}
