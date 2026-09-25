import { Queue } from 'bullmq';
import { getRedisConnectionOptions, getRedisClient } from '../config/redis';
import { prisma } from '../config/db';
import { elasticsearchService } from '../services/elasticsearch.service';

export const EMAIL_QUEUE_NAME = 'email-sending-queue';

export interface EmailJobData {
  scheduledEmailId: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledFor: string;
  delayMs: number;
  hourlyLimit: number;
  idempotencyKey: string;
  userId?: string;
}

let emailQueue: Queue<EmailJobData> | null = null;
let currentBoundPort: number | null = null;

export const resetEmailQueue = () => {
  if (emailQueue) {
    try {
      emailQueue.close();
    } catch (e) {}
    emailQueue = null;
    currentBoundPort = null;
  }
};

export const getEmailQueue = (): Queue<EmailJobData> => {
  const connection = getRedisConnectionOptions();
  const activePort = Number(connection.port);

  if (!emailQueue || currentBoundPort !== activePort) {
    if (emailQueue) {
      try {
        emailQueue.close();
      } catch (e) {}
    }

    currentBoundPort = activePort;
    console.log(`🔌 Binding BullMQ Queue '${EMAIL_QUEUE_NAME}' to Redis port: ${activePort}`);

    emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 1000 },
      },
    });
  }
  return emailQueue;
};

export const scheduleEmailJob = async (params: {
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledFor: Date;
  delayMs?: number;
  hourlyLimit?: number;
  campaignId?: string;
  userId?: string;
}) => {
  const queue = getEmailQueue();
  const scheduledTimeMs = params.scheduledFor.getTime();
  const nowMs = Date.now();
  const delay = Math.max(0, scheduledTimeMs - nowMs);
  const idempotencyKey = `email_${params.senderEmail}_${params.recipientEmail}_${scheduledTimeMs}`;

  // Check existing DB record to preserve idempotency
  let emailRecord = await prisma.scheduledEmail.findUnique({
    where: { idempotencyKey },
  });

  if (!emailRecord) {
    emailRecord = await prisma.scheduledEmail.create({
      data: {
        campaignId: params.campaignId || null,
        senderEmail: params.senderEmail,
        recipientEmail: params.recipientEmail,
        subject: params.subject,
        body: params.body,
        scheduledFor: params.scheduledFor,
        delayMs: params.delayMs || 2000,
        hourlyLimit: params.hourlyLimit || 200,
        status: 'PENDING',
        idempotencyKey,
      },
    });
  }

  // Add delayed job to BullMQ Queue (No Cron!)
  const job = await queue.add(
    'send-email',
    {
      scheduledEmailId: emailRecord.id,
      senderEmail: params.senderEmail,
      recipientEmail: params.recipientEmail,
      subject: params.subject,
      body: params.body,
      scheduledFor: params.scheduledFor.toISOString(),
      delayMs: params.delayMs || 2000,
      hourlyLimit: params.hourlyLimit || 200,
      idempotencyKey,
      userId: params.userId,
    },
    {
      delay,
      jobId: emailRecord.id,
    }
  );

  // Update DB with BullMQ Job ID
  await prisma.scheduledEmail.update({
    where: { id: emailRecord.id },
    data: { bullJobId: job.id },
  });

  // Index in Elasticsearch
  await elasticsearchService.indexEmail({
    id: emailRecord.id,
    senderEmail: emailRecord.senderEmail,
    recipientEmail: emailRecord.recipientEmail,
    subject: emailRecord.subject,
    body: emailRecord.body,
    status: emailRecord.status,
    scheduledFor: emailRecord.scheduledFor.toISOString(),
  });

  return {
    emailRecord,
    jobId: job.id,
    delayMs: delay,
  };
};
