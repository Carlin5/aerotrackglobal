import { redirect } from "next/navigation";
import { TopNav } from "@/components/shared/TopNav";
import { Footer } from "@/components/shared/Footer";
import { LoginForm } from "./LoginForm";
import { Panel } from "@/components/ui/Panel";
import { AmbientBackground } from "@/components/shared/AmbientBackground";
import { ShieldCheck } from "lucide-react";
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
        <div className="mx-auto max-w-md px-4 py-12 sm:px-6 lg:py-20">
          {/* Sign-in panel */}
          <div className="mx-auto w-full">
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
