import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/security";
import { z } from "zod";

const schema = z.object({ size: z.enum(["S", "M", "L", "XL", "XXL"]), quantity: z.number().int().positive() });
export async function POST(request: Request) {
  try {
    const session = await requireRole("ADMIN");
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid stock entry" }, { status: 400 });
    await prisma.$transaction(async (tx) => {
      await tx.centralStock.upsert({ where: { size: parsed.data.size }, create: parsed.data, update: { quantity: { increment: parsed.data.quantity } } });
      await tx.stockLedger.create({ data: { type: "STOCK_IN", ...parsed.data, userId: session.user.id } });
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized or invalid request" }, { status: 403 });
  }
}
