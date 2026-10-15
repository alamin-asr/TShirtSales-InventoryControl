import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/security";

export async function POST(request: Request) {
  try {
    const session = await requireRole("SCANNER");
    if (!session.user.scannerApproved) {
      return NextResponse.json({ error: "Scanner approval is required." }, { status: 403 });
    }
    const body = await request.json();
    const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
    if (!orderId) return NextResponse.json({ error: "Invalid QR code." }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { orderId },
        include: { items: { orderBy: { serialNo: "asc" } } },
      });
      if (!sale) throw new Error("QR_NOT_FOUND");
      if (await tx.scanRecord.findUnique({ where: { saleId: sale.id } })) {
        throw new Error("QR_ALREADY_SCANNED");
      }
      await tx.scanRecord.create({ data: { saleId: sale.id, scannerId: session.user.id } });
      return sale;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({
      success: true,
      receipt: {
        orderId: result.orderId,
        quantity: result.quantity,
        sizes: result.items.map((item) => item.size),
        sellingPoint: result.sellingPointSnapshot,
        createdAt: result.createdAt,
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "QR_NOT_FOUND") return NextResponse.json({ error: "QR code is not valid." }, { status: 404 });
    if (code === "QR_ALREADY_SCANNED") return NextResponse.json({ error: "This QR code was already scanned." }, { status: 409 });
    if (code === "UNAUTHORIZED") return NextResponse.json({ error: "Scanner login required." }, { status: 401 });
    return NextResponse.json({ error: "QR scan failed." }, { status: 500 });
  }
}
