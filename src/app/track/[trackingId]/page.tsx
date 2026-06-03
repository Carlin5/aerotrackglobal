import { headers } from "next/headers";
import { TrackFallback } from "@/components/tracking/TrackFallback";
import { getSimpleSession } from "@/lib/simple-auth";
import type { TrackSnapshot } from "@/components/tracking/useLiveTracking";

export const dynamic = "force-dynamic";

async function fetchSnapshot(
  trackingId: string,
): Promise<TrackSnapshot | null> {
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const base = `${proto}://${host}`;
  const res = await fetch(
    `${base}/api/track/${encodeURIComponent(trackingId)}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  return (await res.json()) as TrackSnapshot;
}

export default async function TrackPage({
  params,
}: {
  params: { trackingId: string };
}) {
  const session = await getSimpleSession();
  const snap = await fetchSnapshot(params.trackingId);

  return (
    <TrackFallback
      trackingId={params.trackingId}
      serverSnapshot={snap}
      authed={!!session}
    />
  );
}
