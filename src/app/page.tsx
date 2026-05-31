import { TopNav } from "@/components/shared/TopNav";
import { Footer } from "@/components/shared/Footer";
import { TrackForm } from "@/components/tracking/TrackForm";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import {
  Globe2,
  Radar,
  ShieldCheck,
  Activity,
  Boxes,
  Plane,
  Snowflake,
  Flame,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  Clock,
  ScanSearch,
  Headphones,
} from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { ContactForm } from "@/components/marketing/ContactForm";
import { CountUpStat } from "@/components/marketing/CountUpStat";
import { Reveal } from "@/components/marketing/Reveal";

export const dynamic = "force-dynamic";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1570710891163-6d3b5c47248b?auto=format&fit=crop&w=2400&q=80";
const FLEET_IMAGE =
  "https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&w=1800&q=80";
const HANGAR_IMAGE =
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&q=80";

export default async function HomePage() {
  const session = await getSession();
  return (
    <>
      <TopNav authed={!!session} />
      <main>
        {/* HERO with photo background */}
        <section className="relative isolate overflow-hidden">
          {/* Photo */}
          <div
            className="absolute inset-0 -z-20 bg-cover bg-center"
            style={{ backgroundImage: `url("${HERO_IMAGE}")` }}
            aria-hidden
          />
          {/* Gradient + grid overlay */}
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-b from-bg-0/85 via-bg-0/75 to-bg-0"
            aria-hidden
          />
          <div className="absolute inset-0 -z-10 grid-bg opacity-40" aria-hidden />
          <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
            <div>
              <Reveal>
                <Badge tone="cyan" dot pulse className="mb-5">
                  Live global ops · realtime telemetry
                </Badge>
              </Reveal>
              <Reveal delay={0.05}>
                <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-ink-0 sm:text-5xl lg:text-6xl">
                  Track any cargo flight in
                  <span className="bg-gradient-to-r from-cyan-400 to-signal-orange bg-clip-text text-transparent">
                    {" "}
                    real time
                  </span>
                  .
                </h1>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-1 sm:text-lg">
                  Enter your tracking ID to follow your shipment across the
                  globe with great-circle precision, true flight timing,
                  midway waypoints, live aircraft telemetry, and emergency
                  alerts.
                </p>
              </Reveal>

              <Reveal delay={0.15}>
                <div className="mt-8 max-w-xl">
                  <TrackForm />
                  <p className="mt-2 text-xs text-ink-3">
                    Format: <span className="font-mono">AT-XXXXXX-YY</span> ·
                    Get your tracking ID from your shipper.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={0.2}>
                <ul className="mt-10 grid max-w-xl grid-cols-2 gap-3 text-sm text-ink-1 sm:grid-cols-3">
                  <li className="flex items-center gap-2">
                    <Globe2 className="h-4 w-4 text-cyan-400" /> 3D &amp; 2D maps
                  </li>
                  <li className="flex items-center gap-2">
                    <Radar className="h-4 w-4 text-cyan-400" /> Live telemetry
                  </li>
                  <li className="flex items-center gap-2">
                    <Plane className="h-4 w-4 text-cyan-400" /> Multi-leg routes
                  </li>
                  <li className="flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-cyan-400" /> Cargo intel
                  </li>
                  <li className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-cyan-400" /> ETA recompute
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-cyan-400" /> Emergency alerts
                  </li>
                </ul>
              </Reveal>
            </div>

            <Reveal delay={0.1}>
              <Panel strong className="overflow-hidden">
                <div className="hud-line mb-5" />
                <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
                  <CountUpStat label="On-time perf." to={97.4} suffix="%" tone="green" digits={1} />
                  <CountUpStat label="Avg cruise" to={880} suffix=" km/h" />
                  <CountUpStat label="Hubs covered" to={64} />
                  <CountUpStat label="Routes mapped" to={3488} />
                  <CountUpStat label="Avg distance" to={6210} suffix=" km" />
                  <CountUpStat label="Mean ETA drift" to={1.2} suffix=" min" tone="cyan" digits={1} />
                </div>
                <div className="mt-6 rounded-xl border border-line bg-bg-1/60 p-4 font-mono text-xs text-ink-2">
                  <div className="mb-2 flex items-center gap-2 text-cyan-400">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                    OPS · STREAMING
                  </div>
                  <pre className="whitespace-pre-wrap leading-relaxed text-ink-1">{`> GLOBAL OPS · LIVE
> JFK→FRA   CRZ  37,000ft   878kt
> HKG→DXB   DSC  18,200ft   612kt
> GRU→JNB   CRZ  39,000ft   903kt
> LAX→SYD   CRZ  35,000ft   851kt`}</pre>
                </div>
              </Panel>
            </Reveal>
          </div>

          {/* Scroll cue */}
          <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3">
            <div className="flex flex-col items-center gap-2">
              <span>Scroll to explore</span>
              <span className="block h-8 w-px animate-pulse bg-cyan-500/60" />
            </div>
          </div>
        </section>

        {/* CAPABILITIES */}
        <section className="relative">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <Badge tone="cyan" className="mb-3">
                  Capabilities
                </Badge>
                <h2 className="text-3xl font-semibold tracking-tight text-ink-0 sm:text-4xl">
                  Built for operators. Loved by shippers.
                </h2>
                <p className="mt-3 text-ink-2">
                  Every feature is engineered around real cargo operations —
                  not flashy mockups. From great-circle routing to mid-flight
                  emergency holds, AeroTrack Pro behaves like the airline ops
                  desks it was modeled after.
                </p>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Globe2,
                  title: "Great-circle routing",
                  text: "Aircraft follow true spherical paths, not flat lines. Midway waypoints honour realistic ground time.",
                },
                {
                  icon: Radar,
                  title: "Live position engine",
                  text: "Position, bearing, altitude and ground speed are recomputed every second from a unified physics model.",
                },
                {
                  icon: Snowflake,
                  title: "Cargo intelligence",
                  text: "Track temperature-controlled and hazardous cargo with proper handling badges and integrity logs.",
                },
                {
                  icon: ShieldCheck,
                  title: "Emergency holds",
                  text: "One-click freeze a flight at its current location with a reason — public page shows a red alert in real time.",
                },
                {
                  icon: ScanSearch,
                  title: "Customer-grade UX",
                  text: "A unique tracking ID per shipment opens the same 3D globe operators use — but redacted for safety.",
                },
                {
                  icon: Plane,
                  title: "Multi-leg flights",
                  text: "From direct hops to JFK→DXB→SYD with refuel stops, ground time is reflected in the live ETA.",
                },
                {
                  icon: Activity,
                  title: "Predictive ETA",
                  text: "ETA is recomputed from the simulation each tick — even as you watch the aircraft land.",
                },
                {
                  icon: ShieldCheck,
                  title: "Operator-only edits",
                  text: "JWT-protected control center. Every change is auditable, every public page is read-only.",
                },
              ].map((item, i) => (
                <Reveal key={item.title} delay={i * 0.04}>
                  <Panel className="h-full">
                    <item.icon className="h-5 w-5 text-cyan-400" />
                    <h3 className="mt-3 text-sm font-semibold tracking-tight text-ink-0">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
                      {item.text}
                    </p>
                  </Panel>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="relative isolate overflow-hidden border-y border-line">
          <div
            className="absolute inset-0 -z-20 bg-cover bg-center opacity-25"
            style={{ backgroundImage: `url("${HANGAR_IMAGE}")` }}
            aria-hidden
          />
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-b from-bg-0 via-bg-0/90 to-bg-0"
            aria-hidden
          />
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <Badge tone="orange" className="mb-3">
                  Workflow
                </Badge>
                <h2 className="text-3xl font-semibold tracking-tight text-ink-0 sm:text-4xl">
                  From manifest to delivered — three steps.
                </h2>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Operator composes the flight",
                  text: "Origin, optional refuel waypoints, destination, aircraft, cruise speed, full cargo manifest, shipper & consignee.",
                },
                {
                  step: "02",
                  title: "Tracking ID is issued",
                  text: "A unique ID like AT-7K9L2M-A1 is generated. Share it with the consignee — no account required.",
                },
                {
                  step: "03",
                  title: "Live tracking begins",
                  text: "Operator flips the live switch. Anyone with the ID watches the great-circle journey in 3D and 2D, with cargo, ETA and status events.",
                },
              ].map((s, i) => (
                <Reveal key={s.step} delay={i * 0.05}>
                  <Panel className="relative h-full">
                    <div className="font-mono text-[40px] leading-none tracking-tight text-cyan-400/70">
                      {s.step}
                    </div>
                    <h3 className="mt-3 text-base font-semibold tracking-tight text-ink-0">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-2">
                      {s.text}
                    </p>
                  </Panel>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FLEET SHOWCASE */}
        <section className="relative">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <Reveal>
              <div className="overflow-hidden rounded-2xl border border-line bg-bg-1">
                <div
                  className="aspect-[4/3] bg-cover bg-center"
                  style={{ backgroundImage: `url("${FLEET_IMAGE}")` }}
                  aria-hidden
                />
                <div className="border-t border-line p-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3">
                    Compatible fleet
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {[
                      "Boeing 747-8F",
                      "Boeing 777F",
                      "Boeing 767-300F",
                      "Airbus A330-200F",
                      "Airbus A350F",
                      "MD-11F",
                      "Boeing 737-800BCF",
                      "Antonov An-124",
                    ].map((m) => (
                      <div
                        key={m}
                        className="flex items-center gap-2 text-ink-1"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        {m}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <Badge tone="cyan" className="mb-3">
                Fleet & cargo profiles
              </Badge>
              <h2 className="text-3xl font-semibold tracking-tight text-ink-0 sm:text-4xl">
                One platform, every cargo profile.
              </h2>
              <p className="mt-3 text-ink-2">
                Whether it&apos;s a humanitarian airlift on an An-124, a daily
                A350F transcon, or a perishables tender on a 777F, AeroTrack
                Pro models the right cruise speed, range and routing.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <CargoProfile
                  icon={Snowflake}
                  title="Cold-chain pharma"
                  text="Temp-controlled containers tracked with real-time integrity badges."
                />
                <CargoProfile
                  icon={Flame}
                  title="Hazardous cargo"
                  text="UN class flagged, handling restrictions visible end-to-end."
                />
                <CargoProfile
                  icon={Boxes}
                  title="General freight"
                  text="Pallets, ULDs, containers — declared value and dimensions captured."
                />
                <CargoProfile
                  icon={Clock}
                  title="Time-critical"
                  text="Live ETA recompute. Public page shows minutes-to-arrival."
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* OPERATIONS / TRUST */}
        <section className="relative isolate overflow-hidden border-t border-line">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-cyan-500/[0.04] via-transparent to-signal-orange/[0.04]" />
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <Reveal>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <CountUpStat label="Deliveries on-time" to={99.1} suffix="%" tone="green" digits={1} />
                <CountUpStat label="Operating hubs" to={64} suffix="" tone="cyan" />
                <CountUpStat label="Avg telemetry latency" to={1.0} suffix="s" tone="cyan" digits={1} />
                <CountUpStat label="Customer NPS" to={71} suffix="" tone="orange" />
              </div>
            </Reveal>
            <Reveal delay={0.05}>
              <div className="mt-12 rounded-2xl border border-line bg-bg-1/60 p-6 backdrop-blur-md sm:p-8">
                <p className="mx-auto max-w-3xl text-center text-lg leading-relaxed text-ink-1 sm:text-xl">
                  &ldquo;AeroTrack Pro replaced three internal dashboards. The
                  emergency-hold workflow alone saved us an entire shift of
                  status calls last quarter.&rdquo;
                </p>
                <div className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3">
                  Operations director · Pharma 3PL
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* CONTACT */}
        <section
          id="contact"
          className="relative isolate overflow-hidden border-t border-line"
        >
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-b from-bg-0 via-bg-0 to-bg-1/40"
            aria-hidden
          />
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
            <Reveal>
              <Badge tone="cyan" className="mb-3">
                Contact us
              </Badge>
              <h2 className="text-3xl font-semibold tracking-tight text-ink-0 sm:text-4xl">
                Talk to a real human about your shipment.
              </h2>
              <p className="mt-3 max-w-md text-ink-2">
                Need a custom integration, an enterprise rollout, or just want
                to talk through a tricky multi-leg route? Drop us a line — we
                read every message.
              </p>

              <div className="mt-8 space-y-4">
                <ContactBlock
                  icon={Mail}
                  label="Email"
                  value="ops@aerotrack.pro"
                  href="mailto:ops@aerotrack.pro"
                />
                <ContactBlock
                  icon={Phone}
                  label="24/7 ops desk"
                  value="+1 (332) 555-0188"
                  href="tel:+13325550188"
                />
                <ContactBlock
                  icon={MapPin}
                  label="Headquarters"
                  value="JFK Air Cargo Center, Bldg. 261, New York"
                />
                <ContactBlock
                  icon={Headphones}
                  label="Customer support"
                  value="Mon–Sun · 24h coverage · 12 languages"
                />
              </div>

              <div className="mt-8 rounded-lg border border-line bg-bg-1/60 p-4 font-mono text-[11px] leading-relaxed text-ink-2 backdrop-blur-md">
                For URGENT shipment issues, please call the 24/7 ops desk.
                Our control center always has a duty operator on shift.
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <Panel strong className="h-full">
                <ContactForm />
              </Panel>
            </Reveal>
          </div>
        </section>

        {/* CTA strip */}
        <section className="border-t border-line">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-10 sm:px-6">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3">
                Ready when you are
              </div>
              <div className="mt-1 text-xl font-semibold tracking-tight text-ink-0">
                Already have a tracking ID? Watch your shipment fly.
              </div>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-bg-1/70 px-4 py-2 text-sm text-ink-1 transition-colors hover:border-cyan-500/40 hover:text-ink-0 cursor-pointer"
            >
              Track now <ArrowRight className="h-4 w-4 text-cyan-400" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function CargoProfile({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-bg-1/60 p-4 backdrop-blur-md">
      <Icon className="h-4 w-4 text-cyan-400" />
      <div className="mt-2 text-sm font-semibold text-ink-0">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-ink-2">{text}</p>
    </div>
  );
}

function ContactBlock({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
}) {
  const Body = (
    <div className="flex items-start gap-3 rounded-lg border border-line bg-bg-1/60 px-4 py-3 backdrop-blur-md transition-colors hover:border-cyan-500/40">
      <Icon className="mt-0.5 h-4 w-4 text-cyan-400" />
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">
          {label}
        </div>
        <div className="mt-0.5 text-sm text-ink-0">{value}</div>
      </div>
    </div>
  );
  if (href)
    return (
      <a href={href} className="block cursor-pointer">
        {Body}
      </a>
    );
  return Body;
}
