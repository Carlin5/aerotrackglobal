import { redirect } from "next/navigation";
import { TopNav } from "@/components/shared/TopNav";
import { Footer } from "@/components/shared/Footer";
import { AdminSubnav } from "./AdminSubnav";
import { AmbientBackground } from "@/components/shared/AmbientBackground";
import { getSimpleSession } from "@/lib/simple-auth";
import { IMG } from "@/lib/images";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSimpleSession();
  if (!session) {
    redirect("/login?next=/admin");
  }

  return (
    <>
      <TopNav authed />
      <AdminSubnav username={session.username} />
      <main className="relative isolate min-h-[calc(100vh-114px)] overflow-hidden">
        <AmbientBackground image={IMG.clouds} opacity={0.12} />
        {children}
      </main>
      <Footer />
    </>
  );
}
