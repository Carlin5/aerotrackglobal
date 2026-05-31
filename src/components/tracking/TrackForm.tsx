"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { normalizeTrackingId } from "@/lib/tracking-id";

export function TrackForm({ initial }: { initial?: string }) {
  const [value, setValue] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = normalizeTrackingId(value);
    if (!id) return;
    setBusy(true);
    router.push(`/track/${encodeURIComponent(id)}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2 sm:flex-row sm:items-stretch"
    >
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
        <Input
          aria-label="Tracking ID"
          placeholder="Enter tracking ID, e.g. AT-7K9L2M-A1"
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          className="h-12 pl-10 font-mono tracking-wider"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <Button
        type="submit"
        variant="accent"
        size="lg"
        disabled={busy || !value.trim()}
      >
        Track shipment <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
