"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { LivePosition } from "@/types";
import { Stat } from "@/components/ui/Panel";
import { formatDuration } from "@/lib/utils";

function stateLabel(s: LivePosition["state"]): string {
  switch (s) {
    case "scheduled":
      return "Scheduled";
    case "boarding":
      return "Loading manifest";
    case "taxi_out":
      return "Taxi · departure";
    case "climb":
      return "Climb";
    case "cruise":
      return "Cruise";
    case "descent":
      return "Descent";
    case "taxi_in":
      return "Taxi · arrival";
    case "ground_hold":
      return "Ground hold";
    case "landed":
      return "Landed";
    case "delivered":
      return "Delivered";
    case "emergency":
      return "Emergency hold";
  }
}

function CountUp({
  value,
  digits = 0,
  duration = 600,
}: {
  value: number;
  digits?: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const start = performance.now();
    const from = display;
    const to = value;
    let raf = 0;
    function step(t: number) {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setDisplay(from + (to - from) * eased);
      if (k < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{display.toFixed(digits)}</>;
}

export function TelemetryHUD({ position }: { position: LivePosition }) {
  const altFt = Math.round((position.altitudeM / 0.3048) / 100) * 100;
  return (
    <div className="rounded-xl border border-line bg-bg-1/60 p-5 backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3">
          Live telemetry
        </div>
        <motion.div
          key={position.state}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="font-mono text-[11px] uppercase tracking-wider text-cyan-400"
        >
          {stateLabel(position.state)}
        </motion.div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <Stat
          label="Ground speed"
          value={<CountUp value={position.groundSpeedKmh} />}
          unit="km/h"
          tone="cyan"
        />
        <Stat
          label="Altitude"
          value={<CountUp value={altFt} />}
          unit="ft"
        />
        <Stat
          label="Bearing"
          value={<CountUp value={position.bearing} />}
          unit="°"
        />
        <Stat
          label="Remaining"
          value={formatDuration(position.remainingMin)}
        />
      </div>
      <div className="mt-5">
        <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">
          <span>Mission progress</span>
          <span className="text-cyan-400">
            <CountUp value={position.progress * 100} digits={1} />%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-bg-2">
          <motion.div
            initial={false}
            animate={{ width: `${position.progress * 100}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 22 }}
            className="h-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-signal-orange shadow-glow"
          />
        </div>
      </div>
    </div>
  );
}
