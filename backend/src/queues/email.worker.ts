import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, EmailJobData, getEmailQueue } from './email.queue';
import { getRedisConnectionOptions, getRedisClient } from '../config/redis';
import { ENV } from '../config/env';
import { prisma } from '../config/db';
import { EtherealService } from '../services/ethereal.service';
import { RateLimiterService } from '../services/rateLimiter.service';
import { SlackService } from '../services/slack.service';
import { elasticsearchService } from '../services/elasticsearch.service';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let activeWorker: Worker<EmailJobData> | null = null;

export const initEmailWorker = (): Worker<EmailJobData> => {
  if (activeWorker) {
    try {
      activeWorker.close();
    } catch (e) {}
    activeWorker = null;
  }

  const connection = getRedisConnectionOptions();

  console.log(`⚡ Initializing BullMQ Worker on Redis port ${connection.port} with concurrency = ${ENV.WORKER_CONCURRENCY}...`);

  activeWorker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const {
        scheduledEmailId,
        senderEmail,
        recipientEmail,
        subject,
        body,
        delayMs,
        hourlyLimit,
        idempotencyKey,
        userId,
      } = job.data;

      console.log(`🔄 Processing Job #${job.id} for recipient: ${recipientEmail} from sender: ${senderEmail}`);

      const redis = getRedisClient();

      // 1. Idempotency Check: Prevent duplicate email sending
      const idempotencyRedisKey = `sent_idempotency:${idempotencyKey}`;
      const isAlreadySentInRedis = await redis.get(idempotencyRedisKey);

      const dbRecord = await prisma.scheduledEmail.findUnique({
        where: { id: scheduledEmailId },
      });

      if (isAlreadySentInRedis || dbRecord?.status === 'SENT') {
        console.log(`⚠️ Idempotency Check: Email ${scheduledEmailId} already sent. Skipping duplicate job.`);
        return { status: 'SKIPPED_DUPLICATE' };
      }

      // Update status to PROCESSING
      await prisma.scheduledEmail.update({
        where: { id: scheduledEmailId },
        data: { status: 'PROCESSING' },
      });

      // 2. Hourly Rate Limiting Check (Atomic Redis Counter)
      const rateLimitResult = await RateLimiterService.checkAndIncrement(senderEmail, hourlyLimit);

      if (!rateLimitResult.allowed) {
        console.warn(
          `🚨 RATE LIMIT HIT for ${senderEmail}! (${rateLimitResult.currentCount}/${hourlyLimit} emails/hr). Deferring job #${job.id}...`
        );

        // Count pending/deferred jobs for this sender to display in alert
        const deferredCount = await prisma.scheduledEmail.count({
          where: { senderEmail, status: { in: ['PENDING', 'RATE_LIMITED'] } },
        });

        // Trigger Live Slack Alert!
        await SlackService.notifyRateLimitHit({
          senderEmail,
          hourlyLimit,
          currentCount: rateLimitResult.currentCount,
          nextResetTime: rateLimitResult.nextResetTime,
          deferredJobsCount: deferredCount + 1,
          userId,
        });

        // Update DB status to RATE_LIMITED
        await prisma.scheduledEmail.update({
          where: { id: scheduledEmailId },
          data: { status: 'RATE_LIMITED' },
        });

        // Index status in Elasticsearch
        await elasticsearchService.indexEmail({
          id: scheduledEmailId,
          senderEmail,
          recipientEmail,
          subject,
          body,
          status: 'RATE_LIMITED',
          scheduledFor: dbRecord?.scheduledFor.toISOString() || new Date().toISOString(),
        });

        // Re-queue job for next hour window top without losing job
        const queue = getEmailQueue();
        await queue.add(
          'send-email',
          { ...job.data },
          { delay: rateLimitResult.msUntilReset }
        );

        return {
          status: 'RATE_LIMITED_DEFERRED',
          rescheduledFor: rateLimitResult.nextResetTime.toISOString(),
          msUntilReset: rateLimitResult.msUntilReset,
        };
      }

      // 3. Minimum Delay between individual email sends (throttling provider)
      const minDelay = Math.max(ENV.MIN_EMAIL_DELAY_MS, delayMs || 2000);
      console.log(`⏱️ Throttling send: waiting ${minDelay}ms delay for ${recipientEmail}...`);
      await sleep(minDelay);

      // 4. Send Email via Ethereal / Brevo SMTP
      try {
        const sendResult = await EtherealService.sendEmail({
          senderEmail,
          recipientEmail,
          subject,
          body,
        });

        // Mark Idempotency Key in Redis (24-hour TTL)
        await redis.set(idempotencyRedisKey, '1', 'EX', 86400);

        // Update DB record as SENT with preview link
        const updatedRecord = await prisma.scheduledEmail.update({
          where: { id: scheduledEmailId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            etherealPreviewUrl: sendResult.previewUrl || null,
          },
        });

        // Index in Elasticsearch
        await elasticsearchService.indexEmail({
          id: scheduledEmailId,
          senderEmail,
          recipientEmail,
          subject,
          body,
          status: 'SENT',
          scheduledFor: updatedRecord.scheduledFor.toISOString(),
          sentAt: updatedRecord.sentAt?.toISOString(),
          etherealPreviewUrl: sendResult.previewUrl || null,
        });

        console.log(`✅ Email #${job.id} successfully sent to ${recipientEmail}! Preview URL: ${sendResult.previewUrl}`);

        return {
          status: 'SENT',
          messageId: sendResult.messageId,
          previewUrl: sendResult.previewUrl,
        };
      } catch (sendError: any) {
        console.error(`❌ Error sending email to ${recipientEmail}:`, sendError);

        const failedTime = new Date();
        await prisma.scheduledEmail.update({
          where: { id: scheduledEmailId },
          data: {
            status: 'FAILED',
            sentAt: failedTime,
            errorMessage: sendError?.message || 'SMTP Transmission Failed',
          },
        });

        await elasticsearchService.indexEmail({
          id: scheduledEmailId,
          senderEmail,
          recipientEmail,
          subject,
          body,
          status: 'FAILED',
          scheduledFor: dbRecord?.scheduledFor.toISOString() || failedTime.toISOString(),
          sentAt: failedTime.toISOString(),
        });

        throw sendError;
      }
    },
    {
      connection: getRedisConnectionOptions(),
      concurrency: ENV.WORKER_CONCURRENCY,
    }
  );

  activeWorker.on('completed', (job) => {
    console.log(`🎉 Job #${job.id} completed successfully.`);
  });

  activeWorker.on('failed', (job, err) => {
    console.error(`💥 Job #${job?.id} failed with error: ${err.message}`);
  });

  return activeWorker;
};
