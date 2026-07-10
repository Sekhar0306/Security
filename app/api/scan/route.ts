import { NextRequest, NextResponse } from "next/server";
import { runScan } from "@/lib/scanner";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let body: { target?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const target = body.target?.trim();
  if (!target) {
    return NextResponse.json({ error: "A 'target' URL is required." }, { status: 400 });
  }

  let result;
  try {
    result = await runScan(target);
  } catch (err) {
    return NextResponse.json(
      { error: "Could not reach the target. Confirm the URL is correct and publicly reachable." },
      { status: 422 }
    );
  }

  const saved = await prisma.scan.create({
    data: {
      target: result.target,
      scannedAt: new Date(result.scannedAt),
      findings: {
        create: result.findings.map((f) => ({
          key: f.key,
          title: f.title,
          severity: f.severity,
          passed: f.passed,
          detail: f.detail,
          recommendation: f.recommendation,
          status: "open",
        })),
      },
    },
    include: { findings: true },
  });

  return NextResponse.json({ scan: saved, summary: result.summary }, { status: 201 });
}
