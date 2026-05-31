"use client";

import { Boxes, Flame, Snowflake, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatKg, formatNumber, formatUsd } from "@/lib/utils";
import type { Cargo, Party } from "@/types";

export function CargoCard({
  cargo,
  shipper,
  consignee,
}: {
  cargo: Cargo;
  shipper: Pick<Party, "name" | "company">;
  consignee: Pick<Party, "name" | "company">;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-bg-1/60 p-5 backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3">
            Cargo manifest
          </div>
          <div className="flex gap-1.5">
            {cargo.hazardous ? (
              <Badge tone="red" dot>
                <ShieldAlert className="h-3 w-3" /> Haz
              </Badge>
            ) : null}
            {cargo.temperatureControlled ? (
              <Badge tone="cyan" dot>
                <Snowflake className="h-3 w-3" /> Cold-chain
              </Badge>
            ) : null}
            {!cargo.hazardous && !cargo.temperatureControlled ? (
              <Badge tone="green" dot>
                <Boxes className="h-3 w-3" /> Standard
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="text-base font-medium leading-snug text-ink-0">
          {cargo.description}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
          <Field label="Pieces" value={formatNumber(cargo.pieces)} />
          <Field label="Weight" value={formatKg(cargo.weightKg)} />
          <Field
            label="Declared value"
            value={cargo.declaredValueUsd ? formatUsd(cargo.declaredValueUsd) : "—"}
          />
          <Field label="Reference" value={cargo.reference || "—"} mono />
          {cargo.dimensions ? (
            <Field
              label="Dimensions"
              value={cargo.dimensions}
              mono
              className="col-span-2 sm:col-span-2"
            />
          ) : null}
        </dl>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <PartyCard title="Shipper" name={shipper.name} company={shipper.company} icon={Flame} />
        <PartyCard title="Consignee" name={consignee.name} company={consignee.company} icon={Boxes} />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">
        {label}
      </dt>
      <dd className={mono ? "font-mono text-sm text-ink-0" : "text-sm text-ink-0"}>
        {value}
      </dd>
    </div>
  );
}

function PartyCard({
  title,
  name,
  company,
  icon: Icon,
}: {
  title: string;
  name: string;
  company?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-line bg-bg-1/60 p-4 backdrop-blur-md">
      <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3">
        <Icon className="h-3 w-3 text-cyan-400" />
        {title}
      </div>
      <div className="text-sm font-medium text-ink-0">{name}</div>
      {company ? (
        <div className="text-xs text-ink-2">{company}</div>
      ) : null}
    </div>
  );
}
