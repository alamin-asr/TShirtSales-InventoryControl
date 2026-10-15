import { addSmsJob } from "@/jobs/queue";
import { prisma } from "@/lib/db";
import type { Size } from "@prisma/client";

export function buildPurchaseMessage(
  quantity: number,
  sizes: Size[],
  totalBought: number,
  receiptUrl: string,
) {
  const limitMessage =
    totalBought >= 5
      ? "This number has reached the maximum 5 T-shirts."
      : `You can buy ${5 - totalBought} more.`;
  return `Thank you! You bought ${quantity} T-shirt(s) (${sizes.join(", ")}). Total: ${totalBought} of 5. ${limitMessage} Verify: ${receiptUrl}`;
}

export async function queuePurchaseSms(saleId: string, recipient: string, message: string) {
  const log = await prisma.smsLog.create({ data: { saleId, recipient, message } });
  await addSmsJob({ saleId, recipient, message, smsLogId: log.id });
}
