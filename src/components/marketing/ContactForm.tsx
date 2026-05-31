"use client";

import { useState } from "react";
import { Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { motion, AnimatePresence } from "framer-motion";

const SUBJECTS = [
  "General inquiry",
  "Track a shipment",
  "Enterprise / API access",
  "Operator account",
  "Press / media",
];

export function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    subject: SUBJECTS[0],
    message: "",
    website: "", // honeypot — hidden
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error || `Send failed (${res.status})`);
        setBusy(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight text-ink-0">
          Send us a message
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-3">
          Reply &lt; 24h
        </span>
      </div>

      <AnimatePresence mode="wait">
        {done ? (
          <motion.div
            key="ok"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 rounded-lg border border-signal-green/40 bg-signal-green/[0.06] p-4"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-signal-green" />
            <div>
              <div className="text-sm font-semibold text-ink-0">
                Message received.
              </div>
              <p className="mt-1 text-sm text-ink-2">
                Thanks {form.name.split(" ")[0] || "there"} — we&apos;ll be in
                touch at <span className="font-mono">{form.email}</span> within
                24 hours.
              </p>
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-xs text-ink-1 hover:border-cyan-500/40 hover:text-ink-0 cursor-pointer"
                onClick={() => {
                  setForm((f) => ({ ...f, message: "" }));
                  setDone(false);
                }}
              >
                Send another
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onSubmit={onSubmit}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name" htmlFor="cf-name">
                <Input
                  id="cf-name"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </Field>
              <Field label="Email" htmlFor="cf-email">
                <Input
                  id="cf-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company" hint="optional" htmlFor="cf-company">
                <Input
                  id="cf-company"
                  value={form.company}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, company: e.target.value }))
                  }
                />
              </Field>
              <Field label="Subject" htmlFor="cf-subject">
                <select
                  id="cf-subject"
                  className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-line bg-bg-1/70 px-3 text-sm text-ink-0 outline-none transition-colors focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20"
                  value={form.subject}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subject: e.target.value }))
                  }
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Message" htmlFor="cf-message">
              <Textarea
                id="cf-message"
                required
                minLength={10}
                rows={5}
                placeholder="Tell us about the shipment, route, or integration you have in mind."
                value={form.message}
                onChange={(e) =>
                  setForm((f) => ({ ...f, message: e.target.value }))
                }
              />
            </Field>

            {/* honeypot — hidden from real users */}
            <div
              aria-hidden
              style={{ position: "absolute", left: "-10000px", top: "auto", height: 0, width: 0, overflow: "hidden" }}
            >
              <label>
                Leave this field empty
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, website: e.target.value }))
                  }
                />
              </label>
            </div>

            {error ? (
              <div className="flex items-start gap-2 rounded-md border border-signal-red/40 bg-signal-red/[0.07] px-3 py-2 text-xs text-signal-red">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
                We&apos;ll never share your details.
              </p>
              <Button type="submit" variant="accent" disabled={busy}>
                <Send className="h-4 w-4" />{" "}
                {busy ? "Sending…" : "Send message"}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
