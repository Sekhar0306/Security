import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["open", "resolved", "ignored"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json(
      { error: `'status' must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const updated = await prisma.finding.update({
    where: { id: params.id },
    data: { status: body.status },
  });

  return NextResponse.json({ finding: updated });
}
