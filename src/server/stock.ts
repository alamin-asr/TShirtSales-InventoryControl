import { Prisma, Size } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AssignStockItem } from "@/types";

export interface AssignStockInput {
  sellingPointName: string;
  items: AssignStockItem[];
  adminId: string;
}

export async function assignStock(input: AssignStockInput) {
  const { sellingPointName, items, adminId } = input;
  if (!items || items.length === 0) {
    throw new Error("EMPTY_ITEMS");
  }
  return prisma.$transaction(
    async (tx) => {
      // Validate and lock central stock for all requested items
      for (const item of items) {
        if (item.quantity <= 0) continue;

        const central = await tx.centralStock.findUnique({
          where: { size: item.size },
        });

        if (!central || central.quantity < item.quantity) {
          throw new Error(`INSUFFICIENT_CENTRAL_STOCK_${item.size}`);
        }

        // Lock row
        await tx.$queryRaw(
          Prisma.sql`SELECT quantity FROM central_stock WHERE size = ${item.size}::"Size" FOR UPDATE`
        );

        // Deduct from central stock
        await tx.centralStock.update({
          where: { size: item.size },
          data: { quantity: { decrement: item.quantity } },
        });

        // Credit to selling point stock
        await tx.sellingPointStock.upsert({
          where: {
            sellingPointName_size: {
              sellingPointName,
              size: item.size,
            },
          },
          create: {
            sellingPointName,
            size: item.size,
            quantity: item.quantity,
          },
          update: {
            quantity: { increment: item.quantity },
          },
        });

        // Record immutable ledger entry
        await tx.stockLedger.create({
          data: {
            type: "ASSIGN",
            size: item.size,
            quantity: item.quantity,
            sellingPointName,
            userId: adminId,
          },
        });
      }

      // Record audit log
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: "STOCK_ASSIGNED",
          details: {
            sellingPointName,
            items: items.map((i) => ({ size: i.size, quantity: i.quantity })),
          },
        },
      });

      return { success: true };
    },
    { isolationLevel: "Serializable", timeout: 10000 }
  );
}

export async function getStockOverview() {
  const sizes: Size[] = ["S", "M", "L", "XL", "XXL"];

  // 1. Central Stock
  const centralRecords = await prisma.centralStock.findMany();
  const centralStock = sizes.map((size) => ({
    size,
    quantity: centralRecords.find((r) => r.size === size)?.quantity ?? 0,
  }));

  // 2. Selling Point Stocks
  const spRecords = await prisma.sellingPointStock.findMany({
    orderBy: [{ sellingPointName: "asc" }, { size: "asc" }],
  });

  const spMap = new Map<string, Record<Size, number>>();
  for (const record of spRecords) {
    if (!spMap.has(record.sellingPointName)) {
      spMap.set(record.sellingPointName, { S: 0, M: 0, L: 0, XL: 0, XXL: 0 });
    }
    const current = spMap.get(record.sellingPointName)!;
    current[record.size] = record.quantity;
  }

  const sellingPoints = Array.from(spMap.entries()).map(([name, stock]) => {
    const totalAvailable = Object.values(stock).reduce((a, b) => a + b, 0);
    return {
      sellingPointName: name,
      stock,
      totalAvailable,
    };
  });

  // 3. Known registered selling points from sellers who might not have stock yet
  const sellers = await prisma.user.findMany({
    where: { role: "SELLER", sellingPointName: { not: null } },
    select: { id: true, sellingPointName: true, fullName: true, phone: true },
  });

  for (const s of sellers) {
    if (s.sellingPointName && !spMap.has(s.sellingPointName)) {
      sellingPoints.push({
        sellingPointName: s.sellingPointName,
        stock: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
        totalAvailable: 0,
      });
    }
  }

  // 4. Recent Ledger Entries
  const recentLedger = await prisma.stockLedger.findMany({
    take: 15,
    where: { type: { in: ["STOCK_IN", "ASSIGN"] } },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { fullName: true, phone: true },
      },
    },
  });

  return {
    centralStock,
    sellingPoints,
    recentLedger,
    totalCentral: centralStock.reduce((sum, item) => sum + item.quantity, 0),
    sellers: sellers.map((seller) => ({
      id: seller.id,
      fullName: seller.fullName,
      phone: seller.phone,
      sellingPointName: seller.sellingPointName,
    })),
  };
}
