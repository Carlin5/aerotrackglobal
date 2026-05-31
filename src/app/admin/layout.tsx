import { redirect } from "next/navigation";
import { TopNav } from "@/components/shared/TopNav";
import { Footer } from "@/components/shared/Footer";
import { AdminSubnav } from "./AdminSubnav";
import { AmbientBackground } from "@/components/shared/AmbientBackground";
import { getSession } from "@/lib/auth";
import { IMG } from "@/lib/images";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");

  return (
    <>
      <TopNav authed />
      <AdminSubnav username={session.sub} />
      <main className="relative isolate min-h-[calc(100vh-114px)] overflow-hidden">
        <AmbientBackground image={IMG.clouds} opacity={0.12} />
        {children}
      </main>
      <Footer />
    </>
  );
}
