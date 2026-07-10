"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Severity = "critical" | "high" | "medium" | "low" | "info";

interface FindingRecord {
  id: string;
  key: string;
  title: string;
  severity: Severity;
  passed: boolean;
  detail: string;
  recommendation: string;
  status: "open" | "resolved" | "ignored";
}

interface ScanRecord {
  id: string;
  target: string;
  scannedAt: string;
  findings: FindingRecord[];
}

const SEVERITY_STYLE: Record<Severity, string> = {
  critical: "bg-critical/15 text-critical border-critical/40",
  high: "bg-high/15 text-high border-high/40",
  medium: "bg-medium/15 text-medium border-medium/40",
  low: "bg-low/15 text-low border-low/40",
  info: "bg-border text-muted border-border",
};

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

export default function DashboardPage() {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);

  const loadScans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/findings");
      const data = await res.json();
      setScans(data.scans || []);
      if (data.scans?.[0]) setActiveScanId((prev) => prev ?? data.scans[0].id);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScans();
  }, [loadScans]);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!target.trim()) return;
    setScanning(true);
    setError(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Scan failed.");
        return;
      }
      setTarget("");
      await loadScans();
      setActiveScanId(data.scan.id);
    } catch {
      setError("Something went wrong reaching the scan API.");
    } finally {
      setScanning(false);
    }
  }

  async function updateStatus(findingId: string, status: string) {
    setScans((prev) =>
      prev.map((scan) => ({
        ...scan,
        findings: scan.findings.map((f) => (f.id === findingId ? { ...f, status: status as FindingRecord["status"] } : f)),
      }))
    );
    await fetch(`/api/findings/${findingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  const activeScan = scans.find((s) => s.id === activeScanId) || scans[0];
  const sortedFindings = activeScan
    ? [...activeScan.findings].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
    : [];

  return (
    <main className="min-h-screen bg-base pb-24">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="font-mono text-sm tracking-wide text-ink">
          sentry<span className="text-accent">line</span>
        </Link>
        <span className="text-xs text-muted">dashboard</span>
      </header>

      <section className="mx-auto max-w-6xl px-6">
        <form
          onSubmit={handleScan}
          className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 sm:flex-row sm:items-center"
        >
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="https://your-app.com"
            className="flex-1 rounded-md border border-border bg-base px-4 py-3 font-mono text-sm text-ink placeholder:text-muted focus:border-accent"
          />
          <button
            type="submit"
            disabled={scanning}
            className="rounded-md bg-accent px-5 py-3 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {scanning ? "Scanning…" : "Run scan"}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-critical">{error}</p>}
        <p className="mt-3 text-xs text-muted">
          Only scan applications you own or have explicit permission to test.
        </p>
      </section>

      <section className="mx-auto mt-10 grid max-w-6xl gap-8 px-6 md:grid-cols-[240px_1fr]">
        <aside>
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">scan history</h2>
          <ul className="mt-4 space-y-2">
            {loading && <li className="text-sm text-muted">Loading…</li>}
            {!loading && scans.length === 0 && (
              <li className="text-sm text-muted">No scans yet. Run your first one above.</li>
            )}
            {scans.map((scan) => (
              <li key={scan.id}>
                <button
                  onClick={() => setActiveScanId(scan.id)}
                  className={`w-full truncate rounded-md border px-3 py-2 text-left text-xs ${
                    scan.id === activeScanId
                      ? "border-accent bg-surfaceAlt text-ink"
                      : "border-border bg-surface text-muted hover:text-ink"
                  }`}
                >
                  <div className="truncate font-mono">{scan.target}</div>
                  <div className="mt-1 text-[10px] text-muted">
                    {new Date(scan.scannedAt).toLocaleString()}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div>
          {!activeScan && !loading && (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted">
              Run a scan to see findings here.
            </div>
          )}

          {activeScan && (
            <div>
              <h2 className="font-mono text-lg text-ink">{activeScan.target}</h2>
              <p className="mt-1 text-xs text-muted">
                Scanned {new Date(activeScan.scannedAt).toLocaleString()} · {sortedFindings.length} checks
              </p>

              <div className="mt-6 space-y-3">
                {sortedFindings.map((f) => (
                  <div key={f.id} className="rounded-lg border border-border bg-surface p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${SEVERITY_STYLE[f.severity]}`}
                        >
                          {f.severity}
                        </span>
                        <span
                          className={`font-mono text-[10px] uppercase tracking-wide ${
                            f.passed ? "text-safe" : "text-muted"
                          }`}
                        >
                          {f.passed ? "PASS" : "NEEDS ATTENTION"}
                        </span>
                      </div>
                      <select
                        value={f.status}
                        onChange={(e) => updateStatus(f.id, e.target.value)}
                        className="rounded-md border border-border bg-base px-2 py-1 text-xs text-ink"
                      >
                        <option value="open">Open</option>
                        <option value="resolved">Resolved</option>
                        <option value="ignored">Ignored</option>
                      </select>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-ink">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted">{f.detail}</p>
                    {!f.passed && (
                      <p className="mt-2 text-xs text-ink/80">
                        <span className="font-semibold text-accent">Fix: </span>
                        {f.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
