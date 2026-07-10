#!/usr/bin/env node
/**
 * Sentryline CLI — passive security scan from the terminal.
 *
 * Usage:
 *   node cli/scan.js <url> [--json] [--api https://your-deployed-app.vercel.app]
 *
 * Only scan applications you own or have explicit permission to test.
 * This tool performs passive, non-intrusive checks only.
 */

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("--"));
const wantsJson = args.includes("--json");
const apiIndex = args.indexOf("--api");
const apiBase = apiIndex !== -1 ? args[apiIndex + 1] : null;

if (!target) {
  console.error("Usage: node cli/scan.js <url> [--json] [--api <deployed-app-url>]");
  process.exit(1);
}

const COMMON_EXPOSED_PATHS = [
  { path: "/.env", title: "Exposed .env file", severity: "critical" },
  { path: "/.git/config", title: "Exposed .git directory", severity: "critical" },
  { path: "/wp-config.php.bak", title: "Exposed WordPress config backup", severity: "critical" },
  { path: "/.well-known/security.txt", title: "security.txt present", severity: "info" },
  { path: "/robots.txt", title: "robots.txt present", severity: "info" },
];

const COLORS = {
  critical: "\x1b[91m",
  high: "\x1b[31m",
  medium: "\x1b[33m",
  low: "\x1b[36m",
  info: "\x1b[90m",
  reset: "\x1b[0m",
  green: "\x1b[32m",
  bold: "\x1b[1m",
};

function normalizeUrl(input) {
  let value = input.trim();
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  return new URL(value);
}

async function fetchSafe(url) {
  try {
    return await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Sentryline-Scanner/1.0 (passive-audit)" },
    });
  } catch {
    return null;
  }
}

async function runScan(rawTarget) {
  const url = normalizeUrl(rawTarget);
  const findings = [];
  const res = await fetchSafe(url.toString());
  const usesHttps = url.protocol === "https:";

  findings.push({
    key: "https-enforced",
    title: "HTTPS in use",
    severity: "critical",
    passed: usesHttps,
    detail: usesHttps ? "Requested over HTTPS." : "Served over plain HTTP.",
    recommendation: "Serve all traffic over HTTPS and redirect HTTP to HTTPS.",
  });

  const headers = res?.headers;
  const headerChecks = [
    { key: "hsts", title: "Strict-Transport-Security header", header: "strict-transport-security", severity: "high" },
    { key: "csp", title: "Content-Security-Policy header", header: "content-security-policy", severity: "high" },
    { key: "x-frame-options", title: "X-Frame-Options / frame-ancestors", header: "x-frame-options", severity: "medium" },
    { key: "x-content-type-options", title: "X-Content-Type-Options header", header: "x-content-type-options", severity: "medium" },
    { key: "referrer-policy", title: "Referrer-Policy header", header: "referrer-policy", severity: "low" },
    { key: "permissions-policy", title: "Permissions-Policy header", header: "permissions-policy", severity: "low" },
  ];

  for (const c of headerChecks) {
    const value = headers?.get(c.header) || "";
    findings.push({
      key: c.key,
      title: c.title,
      severity: c.severity,
      passed: !!value,
      detail: value ? `Header present: ${value.slice(0, 100)}` : "Header not found.",
      recommendation: `Add or fix the '${c.header}' response header.`,
    });
  }

  const serverHeader = headers?.get("server") || "";
  const poweredBy = headers?.get("x-powered-by") || "";
  const disclosesInfo = /\d/.test(serverHeader) || !!poweredBy;
  findings.push({
    key: "server-disclosure",
    title: "Server/technology version disclosure",
    severity: "low",
    passed: !disclosesInfo,
    detail: disclosesInfo ? "Response reveals server/framework details." : "No version-revealing headers found.",
    recommendation: "Suppress 'Server' and 'X-Powered-By' headers.",
  });

  for (const item of COMMON_EXPOSED_PATHS) {
    const pathRes = await fetchSafe(new URL(item.path, url.origin).toString());
    const exists = !!pathRes && pathRes.status === 200;
    const infoOnly = item.severity === "info";
    findings.push({
      key: `path:${item.path}`,
      title: item.title,
      severity: item.severity,
      passed: infoOnly ? exists : !exists,
      detail: exists ? `${item.path} responded with HTTP 200.` : `${item.path} not accessible.`,
      recommendation: infoOnly ? "Informational only." : `Ensure ${item.path} is not publicly served.`,
    });
  }

  return { target: url.toString(), scannedAt: new Date().toISOString(), findings };
}

(async () => {
  const result = await runScan(target);

  if (wantsJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\n${COLORS.bold}sentryline${COLORS.reset} — scanning ${result.target}\n`);
    for (const f of result.findings) {
      const color = COLORS[f.severity] || "";
      const status = f.passed ? `${COLORS.green}PASS${COLORS.reset}` : `${color}FAIL${COLORS.reset}`;
      console.log(`  [${status}] ${f.title}`);
      if (!f.passed) console.log(`         ${COLORS.info}${f.recommendation}${COLORS.reset}`);
    }
    const failed = result.findings.filter((f) => !f.passed && f.severity !== "info").length;
    console.log(`\n${failed} issue(s) found.\n`);
  }

  if (apiBase) {
    try {
      const res = await fetch(`${apiBase.replace(/\/$/, "")}/api/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      if (res.ok) {
        console.log(`Synced to dashboard: ${apiBase}/dashboard`);
      } else {
        console.error("Could not sync results to the dashboard API.");
      }
    } catch {
      console.error("Could not reach the dashboard API to sync results.");
    }
  }
})();
