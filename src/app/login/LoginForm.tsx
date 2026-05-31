"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, PasswordInput, Field } from "@/components/ui/Input";
import { LogIn } from "lucide-react";

export function LoginForm({ nextUrl }: { nextUrl?: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/simple-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error || "Sign-in failed");
        setBusy(false);
        return;
      }
      router.push(nextUrl && nextUrl.startsWith("/") ? nextUrl : "/admin");
      router.refresh();
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Username" htmlFor="u">
        <Input
          id="u"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </Field>
      <Field label="Password" htmlFor="p">
        <PasswordInput
          id="p"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Field>
      {error ? (
        <div className="rounded-md border border-signal-red/40 bg-signal-red/10 px-3 py-2 text-xs text-signal-red">
          {error}
        </div>
      ) : null}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={busy}
      >
        <LogIn className="h-4 w-4" /> {busy ? "Authenticating…" : "Sign in"}
      </Button>
    </form>
  );
}
