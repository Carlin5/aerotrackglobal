"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  to: number;
  suffix?: string;
  digits?: number;
  duration?: number; // ms
  tone?: "default" | "cyan" | "orange" | "green";
}

/** Animated counter that runs once when scrolled into view. */
export function CountUpStat({
  label,
  to,
  suffix,
  digits = 0,
  duration = 1200,
  tone = "default",
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [value, setValue] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      setValue(to);
      return;
    }
    let raf = 0;
    let start = 0;
    let started = false;
    function step(t: number) {
      if (!start) start = t;
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setValue(eased * to);
      if (k < 1) raf = requestAnimationFrame(step);
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !started) {
            started = true;
            raf = requestAnimationFrame(step);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [to, duration, reduce]);

  const toneClass =
    tone === "cyan"
      ? "text-cyan-400"
      : tone === "orange"
        ? "text-signal-orange"
        : tone === "green"
          ? "text-signal-green"
          : "text-ink-0";

  return (
    <div ref={ref}>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-mono tabular-nums text-2xl font-semibold sm:text-3xl",
          toneClass,
        )}
      >
        {value.toFixed(digits)}
        {suffix ? <span className="ml-1 text-base font-normal text-ink-2">{suffix}</span> : null}
      </div>
    </div>
  );
}
