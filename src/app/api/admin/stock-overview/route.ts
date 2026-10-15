import { NextResponse } from "next/server";
import { requireRole } from "@/lib/security";
import { getStockOverview } from "@/server/stock";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const overview = await getStockOverview();
    return NextResponse.json(overview, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to load stock overview" },
      { status: 500 }
    );
  }
}
