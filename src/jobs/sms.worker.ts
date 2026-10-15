import { prisma } from "@/lib/db";
import { getSmsProvider } from "@/jobs/sms-provider";
import type { SmsJobData } from "@/jobs/queue";

export async function processSmsJob(data: SmsJobData): Promise<void> {
  const log = await prisma.smsLog.update({
    where: { id: data.smsLogId },
    data: {
      status: "SENDING",
      attempts: { increment: 1 },
      lastAttemptAt: new Date(),
    },
  });

  try {
    const provider = getSmsProvider();
    const response = await provider.send({
      to: log.recipient,
      message: log.message,
    });

    await prisma.smsLog.update({
      where: { id: log.id },
      data: {
        status: response.success ? "SENT" : "FAILED",
        providerResponse:
          response.providerResponse ??
          (response.error ? response.error : JSON.stringify(response)),
      },
    });

    if (!response.success) {
      throw new Error(response.error || "SMS provider failed");
    }
  } catch (error) {
    await prisma.smsLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        providerResponse:
          error instanceof Error ? error.message : "Provider error",
      },
    });
    throw error;
  }
}
