import * as React from "react";
import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  strong = false,
}: {
  children: React.ReactNode;
  className?: string;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "panel",
        strong && "panel-strong",
        "p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  subtitle,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-mono text-sm uppercase tracking-[0.18em] text-ink-2">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-1 text-xs text-ink-3">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  unit,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  tone?: "default" | "cyan" | "orange" | "green";
}) {
  const t =
    tone === "cyan"
      ? "text-cyan-400"
      : tone === "orange"
        ? "text-signal-orange"
        : tone === "green"
          ? "text-signal-green"
          : "text-ink-0";
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">
        {label}
      </div>
      <div className={cn("font-mono tabular-nums text-xl sm:text-2xl", t)}>
        {value}
        {unit ? (
          <span className="ml-1 text-xs font-normal text-ink-2">{unit}</span>
        ) : null}
      </div>
    </div>
  );
}
