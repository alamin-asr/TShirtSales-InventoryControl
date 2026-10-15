import { Prisma, Size } from "@prisma/client";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import type { CreateSaleParams } from "@/types";

export async function getBuyerAllowance(phone: string) {
  const buyer = await prisma.buyerLimit.findUnique({ where: { phone } });
  const totalBought = buyer?.totalBought ?? 0;
  return { totalBought, remaining: Math.max(0, 5 - totalBought), canBuy: totalBought < 5 };
}

export async function createSale(params: CreateSaleParams) {
  const sizes = params.sizes as Size[];
  return prisma.$transaction(async (tx) => {
    const existing = await tx.sale.findUnique({ where: { idempotencyKey: params.idempotencyKey }, include: { items: true } });
    if (existing) return { sale: existing, totalBought: (await tx.buyerLimit.findUnique({ where: { phone: params.buyerPhone } }))?.totalBought ?? sizes.length };

    const buyer = await tx.buyerLimit.upsert({
      where: { phone: params.buyerPhone },
      create: { phone: params.buyerPhone, totalBought: 0 },
      update: {},
    });
    const lockedBuyer = await tx.$queryRaw<{ total_bought: number }[]>(Prisma.sql`SELECT total_bought FROM buyer_limits WHERE id = ${buyer.id}::uuid FOR UPDATE`);
    const totalBought = Number(lockedBuyer[0]?.total_bought ?? 0);
    if (totalBought + sizes.length > 5) throw new Error("BUYER_LIMIT_REACHED");

    const counts = new Map<Size, number>();
    for (const size of sizes) counts.set(size, (counts.get(size) ?? 0) + 1);
    for (const [size, quantity] of counts) {
      const stock = await tx.sellingPointStock.findUnique({
        where: { sellingPointName_size: { sellingPointName: params.sellingPointName, size } },
      });
      if (!stock || stock.quantity < quantity) throw new Error("INSUFFICIENT_STOCK");
      await tx.$queryRaw(Prisma.sql`SELECT id FROM selling_point_stock WHERE selling_point_name = ${params.sellingPointName} AND size = ${size}::"Size" FOR UPDATE`);
      await tx.sellingPointStock.update({ where: { id: stock.id }, data: { quantity: { decrement: quantity } } });
    }
    const sale = await tx.sale.create({
      data: {
        orderId: `ORD-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${nanoid(8).toUpperCase()}`,
        sellerId: params.sellerId,
        sellingPointSnapshot: params.sellingPointName,
        buyerPhone: params.buyerPhone,
        quantity: sizes.length,
        idempotencyKey: params.idempotencyKey,
        ipAddress: params.ipAddress,
        items: { create: sizes.map((size, index) => ({ size, serialNo: index + 1 })) },
      },
      include: { items: true },
    });
    for (const [size, quantity] of counts) {
      await tx.stockLedger.create({ data: { type: "SALE", size, quantity, sellingPointName: params.sellingPointName, referenceId: sale.id, userId: params.sellerId } });
    }
    await tx.buyerLimit.update({ where: { id: buyer.id }, data: { totalBought: totalBought + sizes.length } });
    return { sale, totalBought: totalBought + sizes.length };
  }, { isolationLevel: "Serializable", timeout: 10000 });
}
