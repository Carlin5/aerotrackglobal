import { headers } from "next/headers";
import { TopNav } from "@/components/shared/TopNav";
import { Footer } from "@/components/shared/Footer";
import { TrackingView } from "@/components/tracking/TrackingView";
import { TrackForm } from "@/components/tracking/TrackForm";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { AmbientBackground } from "@/components/shared/AmbientBackground";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  HelpCircle,
  Mail,
  Plane,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { IMG } from "@/lib/images";
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
  // Any non-OK response (404 not found, 400 bad data, 500 server error) renders
  // the friendly empty state below. We never want this page to crash.
  if (!res.ok) return null;
  return (await res.json()) as TrackSnapshot;
}

export default async function TrackPage({
  params,
}: {
  params: { trackingId: string };
}) {
  const session = await getSession();
  const snap = await fetchSnapshot(params.trackingId);

  if (!snap) {
    return (
      <>
        <TopNav authed={!!session} />
        <main className="relative isolate min-h-[calc(100vh-58px)] overflow-hidden">
          <AmbientBackground image={IMG.airport} opacity={0.3} />
          <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1fr] lg:py-24">
            {/* Left: explanation */}
            <div className="self-center">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-signal-amber">
                No telemetry
              </span>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink-0 sm:text-4xl">
                We couldn&apos;t find that shipment.
              </h1>
              <p className="mt-3 max-w-md text-ink-2">
                The tracking ID{" "}
                <code className="rounded bg-bg-2/80 px-1.5 py-0.5 font-mono text-ink-0">
                  {params.trackingId}
                </code>{" "}
                isn&apos;t in our system. It may have been mistyped, expired,
                or not yet released by your shipper.
              </p>

              <ul className="mt-6 space-y-2 text-sm text-ink-2">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  Double-check the format:{" "}
                  <code className="font-mono text-ink-0">AT-XXXXXX-YY</code>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  Make sure your shipper has activated live tracking on their
                  end.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  Tracking IDs are case-insensitive — paste should still work.
                </li>
              </ul>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4" /> Back to home
                  </Button>
                </Link>
                <Link href="/#contact">
                  <Button variant="ghost">
                    <Mail className="h-4 w-4" /> Contact support
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: try-again form */}
            <Panel strong className="self-center">
              <div className="flex items-center gap-2 mb-4">
                <Search className="h-4 w-4 text-cyan-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3">
                  Try a different ID
                </span>
              </div>
              <TrackForm initial="" />
              <div className="mt-5 flex items-start gap-2 rounded-lg border border-line bg-bg-2/40 p-3 text-xs text-ink-2">
                <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                <span>
                  Need help? Our 24/7 ops desk is on{" "}
                  <a
                    href="tel:+13325550188"
                    className="text-ink-0 underline-offset-2 hover:underline"
                  >
                    +1 (332) 555-0188
                  </a>{" "}
                  or{" "}
                  <a
                    href="mailto:ops@aerotrack.pro"
                    className="text-ink-0 underline-offset-2 hover:underline"
                  >
                    ops@aerotrack.pro
                  </a>
                  .
                </span>
              </div>
            </Panel>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <TopNav authed={!!session} />
      <main className="relative isolate overflow-hidden">
        <AmbientBackground image={IMG.clouds} opacity={0.1} />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
          {/* Friendly header strip */}
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-bg-1/50 px-4 py-2.5 backdrop-blur-md">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/10 ring-1 ring-cyan-500/30">
              <Plane className="h-3.5 w-3.5 -rotate-12 text-cyan-400" />
            </span>
            <span className="text-sm text-ink-1">
              Welcome aboard. You&apos;re tracking shipment{" "}
              <code className="font-mono text-ink-0">
                {snap.flight.trackingId}
              </code>
              .
            </span>
            <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 sm:inline">
              Position recomputed every second · UTC
            </span>
          </div>

          <TrackingView snapshot={snap} />
        </div>
      </main>
      <Footer />
    </>
  );
}
