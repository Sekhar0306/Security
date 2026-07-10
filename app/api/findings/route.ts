import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const scans = await prisma.scan.findMany({
    orderBy: { scannedAt: "desc" },
    include: { findings: true },
    take: 50,
  });
  return NextResponse.json({ scans });
}
