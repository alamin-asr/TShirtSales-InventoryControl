import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/security";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const [scanners, scanCount] = await Promise.all([
      prisma.user.findMany({
        where: { role: "SCANNER" },
        select: {
          id: true,
          fullName: true,
          phone: true,
          scannerApproved: true,
          createdAt: true,
          _count: { select: { scanRecords: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.scanRecord.count(),
    ]);
    return NextResponse.json({ scanners, scanCount });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireRole("ADMIN");
    const body = await request.json();
    if (typeof body?.id !== "string" || typeof body?.approved !== "boolean") {
      return NextResponse.json({ error: "Invalid scanner approval request" }, { status: 400 });
    }
    const scanner = await prisma.user.update({
      where: { id: body.id, role: "SCANNER" },
      data: { scannerApproved: body.approved },
      select: { id: true, scannerApproved: true },
    });
    return NextResponse.json({ scanner });
  } catch {
    return NextResponse.json({ error: "Scanner approval update failed" }, { status: 500 });
  }
}
