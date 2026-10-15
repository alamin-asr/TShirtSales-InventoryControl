import { NextResponse } from "next/server";
import { requireRole } from "@/lib/security";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireRole("ADMIN");
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");
    const search = searchParams.get("search")?.trim();
    const phoneLookup = searchParams.get("phone")?.trim();

    // If looking up a specific phone limit
    if (phoneLookup) {
      const record = await prisma.buyerLimit.findUnique({
        where: { phone: phoneLookup },
      });
      const totalBought = record?.totalBought ?? 0;
      return NextResponse.json({
        phone: phoneLookup,
        totalBought,
        remaining: Math.max(0, 5 - totalBought),
        canBuy: totalBought < 5,
      }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    const where: Prisma.SaleWhereInput = {};
    if (search) {
      where.OR = [
        { orderId: { contains: search, mode: "insensitive" } },
        { buyerPhone: { contains: search } },
        { sellingPointSnapshot: { contains: search, mode: "insensitive" } },
      ];
    }

    // CSV Export
    if (format === "csv") {
      const sales = await prisma.sale.findMany({
        where,
        include: {
          items: true,
          seller: { select: { fullName: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const rows = [
        "Order ID,Date Time,Selling Point,Seller Name,Seller Phone,Buyer Phone,Quantity,Sizes",
      ];

      for (const sale of sales) {
        const sizesStr = sale.items.map((i) => i.size).join("; ");
        const dateStr = sale.createdAt.toISOString();
        rows.push(
          `"${sale.orderId}","${dateStr}","${sale.sellingPointSnapshot}","${sale.seller.fullName}","${sale.seller.phone}","${sale.buyerPhone}",${sale.quantity},"${sizesStr}"`
        );
      }

      const csvContent = rows.join("\n");
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="tshirt-sales-${new Date().toISOString().slice(0, 10)}.csv"`,
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }

    // Paginated JSON response
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10))
    );
    const skip = (page - 1) * pageSize;

    const [totalCount, quantitySummary, sales] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.aggregate({
        where,
        _sum: { quantity: true },
      }),
      prisma.sale.findMany({
        where,
        include: {
          items: true,
          seller: { select: { fullName: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      sales,
      totalCount,
      totalQuantity: quantitySummary._sum.quantity ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch sales records" },
      { status: 500 }
    );
  }
}
