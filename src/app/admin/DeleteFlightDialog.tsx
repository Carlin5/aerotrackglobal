"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface FlightLite {
  id: number;
  trackingId: string;
  flightNumber: string;
  originCode: string;
  destinationCode: string;
}

export function DeleteFlightDialog({
  open,
  flight,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  flight: FlightLite | null;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  return (
    <AnimatePresence>
      {open && flight ? (
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
            onClick={busy ? undefined : onClose}
            className="absolute inset-0 bg-bg-0/80 backdrop-blur-sm"
          />
          <motion.div
            className="relative z-10 w-full max-w-md rounded-2xl border border-line bg-bg-1/95 p-6 shadow-2xl backdrop-blur-md"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-signal-red/15 text-signal-red ring-1 ring-signal-red/40">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-ink-0">
                    Delete flight
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
                disabled={busy}
                className="rounded-md p-1 text-ink-3 hover:bg-white/[0.06] hover:text-ink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-5 text-sm text-ink-1">
              This permanently removes the flight and its tracking record. The
              public tracking link will return a 404 immediately.{" "}
              <strong className="text-ink-0">This cannot be undone.</strong>
            </p>

            {error ? (
              <div className="mt-4 rounded-md border border-signal-red/40 bg-signal-red/10 px-3 py-2 text-xs text-signal-red">
                {error}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={onConfirm}
                disabled={busy}
              >
                <Trash2 className="h-4 w-4" />
                {busy ? "Deleting…" : "Delete flight"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
