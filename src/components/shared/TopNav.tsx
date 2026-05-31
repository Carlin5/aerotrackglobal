import Link from "next/link";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/Button";
import { LogIn, ShieldCheck } from "lucide-react";

export function TopNav({ authed = false }: { authed?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line backdrop-blur-md bg-bg-0/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="cursor-pointer">
          <Logo />
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/"
            className="hidden sm:inline-block rounded-md px-3 py-1.5 text-sm text-ink-2 hover:text-ink-0 transition-colors"
          >
            Track
          </Link>
          <Link
            href="/#contact"
            className="hidden sm:inline-block rounded-md px-3 py-1.5 text-sm text-ink-2 hover:text-ink-0 transition-colors"
          >
            Contact
          </Link>
          {authed ? (
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ShieldCheck className="h-4 w-4" /> Control center
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button variant="ghost" size="sm">
                <LogIn className="h-4 w-4" /> Operator
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
