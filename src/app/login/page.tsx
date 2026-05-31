import { redirect } from "next/navigation";
import { TopNav } from "@/components/shared/TopNav";
import { Footer } from "@/components/shared/Footer";
import { LoginForm } from "./LoginForm";
import { Panel } from "@/components/ui/Panel";
import { AmbientBackground } from "@/components/shared/AmbientBackground";
import { ShieldCheck, Radio, AlertTriangle, Globe2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { IMG } from "@/lib/images";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const session = await getSession();
  if (session) redirect(searchParams.next || "/admin");

  return (
    <>
      <TopNav />
      <main className="relative isolate min-h-[calc(100vh-58px)] overflow-hidden">
        <AmbientBackground image={IMG.airport} opacity={0.35} />
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1fr] lg:py-20">
          {/* Left: welcome + capability list */}
          <div className="hidden lg:flex lg:flex-col lg:justify-center">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-400">
              Operator console
            </span>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink-0">
              Welcome back, operator.
            </h1>
            <p className="mt-3 max-w-md text-ink-2">
              Sign in to compose flights, generate tracking IDs, broadcast live
              positions, and declare emergency holds in real time. You have
              full operational control.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-ink-1">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/10 ring-1 ring-cyan-500/30">
                  <Radio className="h-3.5 w-3.5 text-cyan-400" />
                </span>
                <span>
                  <strong className="text-ink-0">Toggle live</strong> tracking
                  on any flight, watch the great-circle path animate in real
                  time.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md bg-signal-red/10 ring-1 ring-signal-red/30">
                  <AlertTriangle className="h-3.5 w-3.5 text-signal-red" />
                </span>
                <span>
                  <strong className="text-ink-0">Declare emergency holds</strong>{" "}
                  with a reason — the public page freezes the aircraft at its
                  exact live coordinates.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md bg-signal-orange/10 ring-1 ring-signal-orange/30">
                  <Globe2 className="h-3.5 w-3.5 text-signal-orange" />
                </span>
                <span>
                  <strong className="text-ink-0">Compose multi-leg routes</strong>{" "}
                  with refuel waypoints, ground time and aircraft selection.
                </span>
              </li>
            </ul>
          </div>

          {/* Right: sign-in panel */}
          <div className="mx-auto w-full max-w-md self-center">
            <div className="mb-8 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 ring-1 ring-cyan-500/40 shadow-glow">
                <ShieldCheck className="h-5 w-5 text-cyan-400" />
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink-0">
                Operator sign-in
              </h2>
              <p className="mt-1 text-sm text-ink-2">
                Restricted to authorized control-center personnel.
              </p>
            </div>
            <Panel strong className="w-full">
              <LoginForm nextUrl={searchParams.next} />
            </Panel>
            <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3">
              Encrypted JWT session · cookie · SameSite Lax
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
