import { NextResponse } from "next/server";
import { createSale } from "@/server/sales";
import { queuePurchaseSms, buildPurchaseMessage } from "@/lib/sms";
import { requireRole } from "@/lib/security";
import { saleSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const session = await requireRole("SELLER");
    const parsed = saleSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid sale details" }, { status: 400 });
    if (parsed.data.sizes.length !== 1) {
      return NextResponse.json({ error: "Each purchase must contain exactly one T-shirt." }, { status: 400 });
    }
    const result = await createSale({ sellerId: session.user.id, sellingPointName: session.user.sellingPointName ?? "", buyerPhone: parsed.data.buyerPhone, sizes: parsed.data.sizes, idempotencyKey: parsed.data.idempotencyKey });
    const publicOrigin = process.env.PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
    const receiptUrl = `${publicOrigin}/receipt/${encodeURIComponent(result.sale.orderId)}`;
    const message = buildPurchaseMessage(
      result.sale.quantity,
      result.sale.items.map((item) => item.size),
      result.totalBought,
      receiptUrl,
    );
    await queuePurchaseSms(result.sale.id, result.sale.buyerPhone, message);
    return NextResponse.json({ success: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "BUYER_LIMIT_REACHED") return NextResponse.json({ error: "This number has reached the purchase limit. Use another number." }, { status: 409 });
    if (code === "INSUFFICIENT_STOCK") return NextResponse.json({ error: "Insufficient stock for one or more selected sizes." }, { status: 409 });
    return NextResponse.json({ error: "Sale could not be completed" }, { status: 500 });
  }
}
