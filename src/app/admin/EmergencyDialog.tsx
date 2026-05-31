"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { motion, AnimatePresence } from "framer-motion";

interface FlightLite {
  id: number;
  trackingId: string;
  flightNumber: string;
  originCode: string;
  destinationCode: string;
}

interface Props {
  open: boolean;
  flight: FlightLite | null;
  mode: "declare" | "clear";
  onClose: () => void;
  onDone: () => void;
}

const PRESETS = [
  "Severe weather diversion — holding pattern instructed by ATC",
  "Mechanical inspection required — diverted to nearest suitable airport",
  "Medical emergency on board — emergency landing in progress",
  "Security hold — awaiting clearance from ground authorities",
  "Cargo integrity check — temperature deviation requires inspection",
];

export function EmergencyDialog({
  open,
  flight,
  mode,
  onClose,
  onDone,
}: Props) {
  const [reason, setReason] = useState("");
  const [resumeEta, setResumeEta] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state whenever the dialog opens for a different flight or mode
  useEffect(() => {
    if (open) {
      setReason("");
      setResumeEta("");
      setError(null);
    }
  }, [open, flight?.id, mode]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!flight) return null;

  async function submit() {
    if (!flight) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "declare") {
        if (reason.trim().length < 3) {
          setError("Please provide a reason (at least 3 characters).");
          setBusy(false);
          return;
        }
        const res = await fetch(`/api/flights/${flight.id}/emergency`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: reason.trim(),
            resumeEta: resumeEta.trim()
              ? new Date(resumeEta + ":00Z").toISOString()
              : undefined,
          }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          setError(j.error || `Request failed (${res.status})`);
          setBusy(false);
          return;
        }
      } else {
        const res = await fetch(`/api/flights/${flight.id}/emergency`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeStatus: "in_flight" }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          setError(j.error || `Request failed (${res.status})`);
          setBusy(false);
          return;
        }
      }
      onDone();
      onClose();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-modal="true"
          role="dialog"
        >
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="absolute inset-0 bg-bg-0/80 backdrop-blur-sm"
          />
          <motion.div
            className="relative z-10 w-full max-w-lg rounded-2xl border border-line bg-bg-1/95 p-6 shadow-2xl backdrop-blur-md"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span
                  className={
                    "mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 " +
                    (mode === "declare"
                      ? "bg-signal-red/15 text-signal-red ring-signal-red/40"
                      : "bg-signal-green/15 text-signal-green ring-signal-green/40")
                  }
                >
                  {mode === "declare" ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <ShieldCheck className="h-5 w-5" />
                  )}
                </span>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-ink-0">
                    {mode === "declare"
                      ? "Declare emergency hold"
                      : "Clear emergency & resume"}
                  </h3>
                  <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                    {flight.flightNumber} · {flight.originCode} →{" "}
                    {flight.destinationCode} · {flight.trackingId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                className="rounded-md p-1 text-ink-3 hover:bg-white/[0.06] hover:text-ink-0 cursor-pointer"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {mode === "declare" ? (
                <>
                  <div className="rounded-md border border-signal-amber/40 bg-signal-amber/[0.06] px-3 py-2 text-[12px] leading-relaxed text-signal-amber">
                    The aircraft will be frozen at its{" "}
                    <strong>current live position</strong> on every public map.
                    Status changes to <code>emergency_stop</code>.
                  </div>
                  <Field label="Reason for emergency" htmlFor="er">
                    <Textarea
                      id="er"
                      placeholder="Provide a brief operational reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </Field>
                  <div>
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">
                      Quick presets
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESETS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setReason(p)}
                          className="rounded-md border border-line bg-bg-2/40 px-2 py-1 text-[11px] text-ink-2 transition-colors hover:border-signal-red/40 hover:text-ink-0 cursor-pointer"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Field label="Estimated resume (UTC)" hint="optional" htmlFor="re">
                    <Input
                      id="re"
                      type="datetime-local"
                      value={resumeEta}
                      onChange={(e) => setResumeEta(e.target.value)}
                    />
                  </Field>
                </>
              ) : (
                <p className="text-sm text-ink-1">
                  Clearing the emergency will resume normal live tracking. The
                  flight time-line and great-circle simulation pick up from the
                  scheduled plan again. Status returns to{" "}
                  <code>in_flight</code>.
                </p>
              )}

              {error ? (
                <div className="rounded-md border border-signal-red/40 bg-signal-red/10 px-3 py-2 text-xs text-signal-red">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                variant={mode === "declare" ? "danger" : "primary"}
                onClick={submit}
                disabled={busy}
              >
                {mode === "declare" ? (
                  <>
                    <ShieldAlert className="h-4 w-4" />
                    {busy ? "Declaring…" : "Declare emergency"}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    {busy ? "Resuming…" : "Resume flight"}
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
