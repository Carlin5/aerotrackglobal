"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldCheck, Plus, LogOut, LayoutGrid, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function AdminSubnav({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const tabs = [
    { href: "/admin", label: "Mission board", icon: LayoutGrid, exact: true },
    { href: "/admin/flights/new", label: "Compose flight", icon: Plus, exact: false },
    { href: "/admin/emergency", label: "Emergency", icon: AlertTriangle, exact: true },
  ];

  return (
    <div className="border-b border-line bg-bg-0/60 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <nav className="flex items-center gap-1">
          {tabs.map((t) => {
            const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/30"
                    : "text-ink-2 hover:text-ink-0 hover:bg-white/[0.04]",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3 sm:flex">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
            Operator <span className="text-ink-0">{username}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
