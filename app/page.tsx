import Link from "next/link";

const READOUT: Array<{ label: string; status: "PASS" | "FAIL" | "WARN" }> = [
  { label: "checking strict-transport-security", status: "PASS" },
  { label: "checking content-security-policy", status: "FAIL" },
  { label: "checking cookie flags (Secure, HttpOnly, SameSite)", status: "WARN" },
  { label: "checking exposed .env / .git paths", status: "PASS" },
  { label: "checking mixed content on https", status: "PASS" },
  { label: "checking server version disclosure", status: "FAIL" },
];

const STATUS_COLOR: Record<string, string> = {
  PASS: "text-safe",
  FAIL: "text-critical",
  WARN: "text-medium",
};

const PILLARS = [
  {
    eyebrow: "Scan",
    title: "Passive checks, run safely",
    body: "Sentryline inspects the same responses a browser would see — headers, cookies, certificates, common exposed paths — with no exploitation or injection involved.",
  },
  {
    eyebrow: "Track",
    title: "Findings that don't disappear",
    body: "Every scan is saved. Mark findings resolved or ignored, and watch your security posture trend across releases instead of starting from zero each time.",
  },
  {
    eyebrow: "Ship",
    title: "One engine, three surfaces",
    body: "The same scanning logic powers the web dashboard, the JSON API, and a CLI you can drop straight into a CI pipeline.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-base">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="font-mono text-sm tracking-wide text-ink">
          sentry<span className="text-accent">line</span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-muted">
          <Link href="#how-it-works" className="hover:text-ink">
            How it works
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md border border-border bg-surface px-4 py-2 text-ink hover:border-accent"
          >
            Open dashboard
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-2 md:items-center md:py-24">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            passive security auditing
          </p>
          <h1 className="mt-4 font-mono text-4xl font-medium leading-tight text-ink md:text-5xl">
            Know what your app
            <br />
            exposes before someone
            <br />
            else finds it.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted">
            Point Sentryline at a URL. It checks headers, cookies, certificates, and common
            misconfigurations — then keeps a running record so findings get fixed, not forgotten.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/dashboard"
              className="rounded-md bg-accent px-5 py-3 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Run your first scan
            </Link>
            <a
              href="#how-it-works"
              className="rounded-md border border-border px-5 py-3 text-sm font-medium text-ink hover:border-accent"
            >
              See how it works
            </a>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6 font-mono text-sm shadow-2xl">
          <div className="mb-4 flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-critical/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-medium/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-safe/70" />
          </div>
          <p className="mb-3 text-muted">$ sentryline scan https://example.com</p>
          <ul className="space-y-2">
            {READOUT.map((line, i) => (
              <li
                key={line.label}
                className="readout-line flex items-center justify-between gap-4"
                style={{ animationDelay: `${i * 0.18 + 0.2}s` }}
              >
                <span className="text-muted">{line.label}</span>
                <span className={`font-semibold ${STATUS_COLOR[line.status]}`}>{line.status}</span>
              </li>
            ))}
          </ul>
          <p
            className="readout-line mt-4 border-t border-border pt-3 text-muted"
            style={{ animationDelay: "1.3s" }}
          >
            2 critical · 1 warning · 3 passed
          </p>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-muted">how it works</h2>
          <div className="mt-8 grid gap-10 md:grid-cols-3">
            {PILLARS.map((p) => (
              <div key={p.title}>
                <p className="font-mono text-xs uppercase tracking-widest text-accent">{p.eyebrow}</p>
                <h3 className="mt-3 text-lg font-semibold text-ink">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-lg border border-border bg-surface p-8 md:p-12">
          <h2 className="font-mono text-2xl text-ink">Only scan what you're authorized to test.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Sentryline is built for teams checking their own applications — or targets they have
            explicit permission to assess. Every check is passive: it reads public responses the
            way a browser or search engine already does, and never attempts to exploit anything it
            finds.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block rounded-md bg-accent px-5 py-3 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Go to dashboard
          </Link>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-xs text-muted">
        sentryline — passive application security scanning
      </footer>
    </main>
  );
}
