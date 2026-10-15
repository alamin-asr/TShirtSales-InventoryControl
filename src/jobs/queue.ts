import { Queue, QueueOptions } from 'bullmq';

export interface SmsJobData {
  saleId?: string | null;
  recipient: string;
  message: string;
  smsLogId: string;
}

export const SMS_QUEUE_NAME = 'sms-queue';

export const defaultSmsJobOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential' as const,
    delay: 30000, // 30s base delay with exponential backoff
  },
  removeOnComplete: {
    count: 1000,
  },
  removeOnFail: {
    count: 5000,
  },
};

function getRedisConnectionOptions() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  try {
    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname || 'localhost',
      port: parsed.port ? parseInt(parsed.port, 10) : 6379,
      password: parsed.password || undefined,
      username: parsed.username || undefined,
      tls: parsed.protocol === 'rediss:' ? {} : undefined,
      maxRetriesPerRequest: null,
    };
  } catch {
    return {
      maxRetriesPerRequest: null,
    };
  }
}

const connectionOptions = getRedisConnectionOptions();

/**
 * BullMQ SMS Queue instance.
 * Null if REDIS_URL is not provided (falls back to inline execution).
 */
export const smsQueue: Queue<SmsJobData> | null = connectionOptions
  ? new Queue<SmsJobData>(SMS_QUEUE_NAME, {
      connection: connectionOptions,
      defaultJobOptions: defaultSmsJobOptions,
    } as QueueOptions)
  : null;

/**
 * Enqueue an SMS job to BullMQ, or process in-process if Redis is unavailable.
 */
export async function addSmsJob(data: SmsJobData): Promise<string> {
  if (smsQueue && process.env.REDIS_URL) {
    try {
      const job = await smsQueue.add('send-sms', data, defaultSmsJobOptions);
      return job.id ? String(job.id) : `job-${Date.now()}`;
    } catch (queueErr) {
      console.warn(
        '[SMS Queue] Redis queue push failed, falling back to in-process execution:',
        queueErr
      );
    }
  }

  // Fallback: In-process execution (for development or when Redis is absent)
  setImmediate(async () => {
    try {
      const { processSmsJob } = await import('./sms.worker');
      await processSmsJob(data);
    } catch (inlineErr) {
      console.error('[SMS Inline Execution] Job processing error:', inlineErr);
    }
  });

  return `inline-${Date.now()}`;
}
