import { NextResponse } from "next/server";
import { requireRole } from "@/lib/security";
import { assignStock } from "@/server/stock";
import { z } from "zod";

const assignSchema = z.object({
  sellingPointName: z.string().trim().min(1, "Selling point name is required"),
  items: z.array(
    z.object({
      size: z.enum(["S", "M", "L", "XL", "XXL"]),
      quantity: z.number().int().positive("Quantity must be positive"),
    })
  ).min(1, "At least one item must be assigned"),
});

export async function POST(request: Request) {
  try {
    const session = await requireRole("ADMIN");
    const json = await request.json().catch(() => null);
    const parsed = assignSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid assignment data", details: parsed.error.issues },
        { status: 400 }
      );
    }

    await assignStock({
      sellingPointName: parsed.data.sellingPointName,
      items: parsed.data.items,
      adminId: session.user.id,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("INSUFFICIENT_CENTRAL_STOCK")) {
      const size = message.replace("INSUFFICIENT_CENTRAL_STOCK_", "");
      return NextResponse.json(
        { error: `Insufficient central warehouse stock for size ${size}.` },
        { status: 409 }
      );
    }

    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Could not complete stock assignment" },
      { status: 500 }
    );
  }
}
