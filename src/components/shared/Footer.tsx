export function Footer() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-4 py-8 text-xs text-ink-3 sm:flex-row sm:items-center sm:px-6">
        <div className="font-mono tracking-wider">
          AEROTRACK PRO · GLOBAL CARGO OPERATIONS · v1.0
        </div>
        <div className="font-mono">
          UTC{" "}
          <time suppressHydrationWarning>
            {new Date().toISOString().slice(0, 19).replace("T", " ")}
          </time>
        </div>
      </div>
    </footer>
  );
}
