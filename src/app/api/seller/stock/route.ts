import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireRole("SELLER");
    const stocks = await prisma.sellingPointStock.findMany({ where: { sellingPointName: session.user.sellingPointName ?? "" }, orderBy: { size: "asc" } });
    return NextResponse.json({ stocks }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
