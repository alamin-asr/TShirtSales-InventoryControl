import { NextResponse } from "next/server";
import { getBuyerAllowance, } from "@/server/sales";
import { requireRole } from "@/lib/security";
import { buyerPhoneSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    await requireRole("SELLER");
    const parsed = buyerPhoneSchema.safeParse((await request.json()).phone);
    if (!parsed.success) return NextResponse.json({ error: "Buyer phone number must be exactly 11 digits" }, { status: 400 });
    return NextResponse.json(await getBuyerAllowance(parsed.data));
  } catch {
    return NextResponse.json({ error: "Unable to check this number" }, { status: 401 });
  }
}
