import { Worker } from "bullmq";
import { processSmsJob } from "@/jobs/sms.worker";
import type { SmsJobData } from "@/jobs/queue";

export { processSmsJob };

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.warn("REDIS_URL is not configured. BullMQ background worker not started (using inline execution).");
} else {
  try {
    const parsed = new URL(redisUrl);
    const connection = {
      host: parsed.hostname || "localhost",
      port: Number(parsed.port || 6379),
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      tls: parsed.protocol === "rediss:" ? {} : undefined,
      maxRetriesPerRequest: null,
    };

    const worker = new Worker<SmsJobData>(
      "sms-queue",
      async (job) => {
        await processSmsJob(job.data);
      },
      { connection }
    );

    worker.on("completed", (job) => {
      console.log(`[SMS Worker] Job ${job.id} sent successfully`);
    });

    worker.on("failed", (job, err) => {
      console.error(`[SMS Worker] Job ${job?.id} failed:`, err);
    });

    console.log("[SMS Worker] Listening on sms-queue via Redis");
  } catch (err) {
    console.error("[SMS Worker] Failed to initialize Redis connection:", err);
  }
}
