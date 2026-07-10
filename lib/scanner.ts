/**
 * Sentryline scanning engine.
 *
 * IMPORTANT: This engine performs only passive, non-intrusive checks against
 * a target you own or are authorized to test. It inspects HTTP responses,
 * headers, and publicly-served files that a normal browser request would
 * also retrieve. It does NOT attempt exploitation, injection, brute force,
 * or port scanning of any kind.
 *
 * Only scan applications you own or have explicit permission to test.
 */

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface Finding {
  key: string;
  title: string;
  severity: Severity;
  passed: boolean;
  detail: string;
  recommendation: string;
}

export interface ScanResult {
  target: string;
  scannedAt: string;
  findings: Finding[];
  summary: Record<Severity, number>;
}

const COMMON_EXPOSED_PATHS = [
  { path: "/.env", title: "Exposed .env file", severity: "critical" as Severity },
  { path: "/.git/config", title: "Exposed .git directory", severity: "critical" as Severity },
  { path: "/wp-config.php.bak", title: "Exposed WordPress config backup", severity: "critical" as Severity },
  { path: "/.well-known/security.txt", title: "security.txt present", severity: "info" as Severity },
  { path: "/robots.txt", title: "robots.txt present", severity: "info" as Severity },
];

function normalizeUrl(input: string): URL {
  let value = input.trim();
  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }
  return new URL(value);
}

async function fetchSafe(url: string, init?: RequestInit) {
  try {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Sentryline-Scanner/1.0 (passive-audit)" },
      ...init,
    });
    return res;
  } catch {
    return null;
  }
}

function pushFinding(findings: Finding[], f: Finding) {
  findings.push(f);
}

export async function runScan(rawTarget: string): Promise<ScanResult> {
  const target = normalizeUrl(rawTarget);
  const findings: Finding[] = [];

  // 1. HTTPS enforcement
  const httpsRes = await fetchSafe(target.toString());
  const usesHttps = target.protocol === "https:";
  pushFinding(findings, {
    key: "https-enforced",
    title: "HTTPS in use",
    severity: "critical",
    passed: usesHttps,
    detail: usesHttps
      ? "Target was requested over HTTPS."
      : "Target is served over plain HTTP. Traffic can be intercepted or modified in transit.",
    recommendation: "Serve all traffic over HTTPS and redirect HTTP requests to HTTPS.",
  });

  // 2. If HTTP, check if it redirects to HTTPS
  if (!usesHttps) {
    const redirectsToHttps =
      httpsRes && [301, 302, 307, 308].includes(httpsRes.status) &&
      (httpsRes.headers.get("location") || "").startsWith("https://");
    pushFinding(findings, {
      key: "http-redirect",
      title: "HTTP redirects to HTTPS",
      severity: "high",
      passed: !!redirectsToHttps,
      detail: redirectsToHttps
        ? "HTTP requests are redirected to HTTPS."
        : "HTTP requests are not automatically redirected to HTTPS.",
      recommendation: "Add a server-level redirect from HTTP to HTTPS.",
    });
  }

  const headers = httpsRes?.headers;

  const headerChecks: Array<{
    key: string;
    title: string;
    header: string;
    severity: Severity;
    validate?: (v: string) => boolean;
    recommendation: string;
  }> = [
    {
      key: "hsts",
      title: "Strict-Transport-Security header",
      header: "strict-transport-security",
      severity: "high",
      recommendation: "Add 'Strict-Transport-Security: max-age=63072000; includeSubDomains; preload'.",
    },
    {
      key: "csp",
      title: "Content-Security-Policy header",
      header: "content-security-policy",
      severity: "high",
      recommendation: "Define a Content-Security-Policy that restricts script, style, and frame sources.",
    },
    {
      key: "x-frame-options",
      title: "X-Frame-Options / frame-ancestors",
      header: "x-frame-options",
      severity: "medium",
      recommendation: "Add 'X-Frame-Options: DENY' or a CSP 'frame-ancestors' directive to prevent clickjacking.",
    },
    {
      key: "x-content-type-options",
      title: "X-Content-Type-Options header",
      header: "x-content-type-options",
      severity: "medium",
      validate: (v) => v.toLowerCase().includes("nosniff"),
      recommendation: "Add 'X-Content-Type-Options: nosniff' to prevent MIME-sniffing attacks.",
    },
    {
      key: "referrer-policy",
      title: "Referrer-Policy header",
      header: "referrer-policy",
      severity: "low",
      recommendation: "Add a 'Referrer-Policy' such as 'strict-origin-when-cross-origin'.",
    },
    {
      key: "permissions-policy",
      title: "Permissions-Policy header",
      header: "permissions-policy",
      severity: "low",
      recommendation: "Add a 'Permissions-Policy' to restrict access to browser features (camera, mic, geolocation).",
    },
  ];

  for (const check of headerChecks) {
    const value = headers?.get(check.header) || "";
    const present = !!value && (check.validate ? check.validate(value) : true);
    pushFinding(findings, {
      key: check.key,
      title: check.title,
      severity: check.severity,
      passed: present,
      detail: present
        ? `Header present: ${value.slice(0, 120)}`
        : `Header not found or misconfigured on the response.`,
      recommendation: check.recommendation,
    });
  }

  // Information disclosure via Server / X-Powered-By
  const serverHeader = headers?.get("server") || "";
  const poweredBy = headers?.get("x-powered-by") || "";
  const disclosesInfo = /\d/.test(serverHeader) || !!poweredBy;
  pushFinding(findings, {
    key: "server-disclosure",
    title: "Server/technology version disclosure",
    severity: "low",
    passed: !disclosesInfo,
    detail: disclosesInfo
      ? `Response reveals server/framework details (Server: "${serverHeader || "n/a"}", X-Powered-By: "${poweredBy || "n/a"}").`
      : "No obvious version-revealing headers found.",
    recommendation: "Suppress or generalize 'Server' and 'X-Powered-By' headers to avoid revealing exact software versions.",
  });

  // Cookie flags
  const setCookie = headers?.get("set-cookie") || "";
  if (setCookie) {
    const secure = /secure/i.test(setCookie);
    const httpOnly = /httponly/i.test(setCookie);
    const sameSite = /samesite/i.test(setCookie);
    pushFinding(findings, {
      key: "cookie-secure",
      title: "Cookies use Secure flag",
      severity: "high",
      passed: secure,
      detail: secure ? "Set-Cookie includes the Secure attribute." : "Set-Cookie is missing the Secure attribute.",
      recommendation: "Set the 'Secure' attribute on all cookies so they are only sent over HTTPS.",
    });
    pushFinding(findings, {
      key: "cookie-httponly",
      title: "Cookies use HttpOnly flag",
      severity: "high",
      passed: httpOnly,
      detail: httpOnly ? "Set-Cookie includes HttpOnly." : "Set-Cookie is missing HttpOnly, allowing JS access to the cookie.",
      recommendation: "Set the 'HttpOnly' attribute on session cookies to prevent access via JavaScript.",
    });
    pushFinding(findings, {
      key: "cookie-samesite",
      title: "Cookies use SameSite attribute",
      severity: "medium",
      passed: sameSite,
      detail: sameSite ? "Set-Cookie includes a SameSite attribute." : "Set-Cookie is missing SameSite.",
      recommendation: "Set 'SameSite=Lax' or 'Strict' on cookies to reduce CSRF risk.",
    });
  }

  // Common exposed paths (passive GET only)
  for (const item of COMMON_EXPOSED_PATHS) {
    const url = new URL(item.path, target.origin).toString();
    const res = await fetchSafe(url);
    const exists = !!res && res.status === 200;
    const isInfoOnly = item.severity === "info";
    pushFinding(findings, {
      key: `path:${item.path}`,
      title: item.title,
      severity: item.severity,
      passed: isInfoOnly ? exists : !exists,
      detail: exists
        ? `${item.path} responded with HTTP 200.`
        : `${item.path} was not accessible (no 200 response).`,
      recommendation: isInfoOnly
        ? "Informational only — no action required."
        : `Ensure ${item.path} is not publicly served. Remove it from the web root or block it at the server/CDN level.`,
    });
  }

  // Mixed content (only when the page itself is HTTPS and returned HTML)
  if (usesHttps && httpsRes && httpsRes.ok) {
    try {
      const html = await httpsRes.clone().text();
      const hasMixedContent = /src=["']http:\/\//i.test(html) || /href=["']http:\/\//i.test(html);
      pushFinding(findings, {
        key: "mixed-content",
        title: "No mixed content on HTTPS page",
        severity: "medium",
        passed: !hasMixedContent,
        detail: hasMixedContent
          ? "Page loaded over HTTPS references at least one resource over plain HTTP."
          : "No obvious HTTP resource references found in the HTML.",
        recommendation: "Update all asset references (scripts, styles, images) to use HTTPS or protocol-relative URLs.",
      });
    } catch {
      // response body unavailable (e.g. redirect); skip this check silently
    }
  }

  const summary: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) {
    if (!f.passed && f.severity !== "info") summary[f.severity]++;
  }

  return {
    target: target.toString(),
    scannedAt: new Date().toISOString(),
    findings,
    summary,
  };
}
