import { Request, Response } from 'express';
import { getEmailQueue } from '../queues/email.queue';
import { prisma } from '../config/db';

export class QueueController {
  /**
   * GET /api/queue/stats
   * Get live BullMQ queue metrics and system status
   */
  static async getQueueStats(req: Request, res: Response) {
    try {
      const userEmail = (req.query.userEmail as string) || (req.query.email as string);
      const queue = getEmailQueue();
      const jobCounts = await queue.getJobCounts('active', 'completed', 'failed', 'delayed', 'waiting', 'paused');

      const userWhere = userEmail
        ? {
            OR: [
              { senderEmail: userEmail },
              { campaign: { user: { email: userEmail } } },
            ],
          }
        : {};

      const totalScheduled = await prisma.scheduledEmail.count({
        where: {
          status: { in: ['PENDING', 'PROCESSING', 'RATE_LIMITED'] },
          ...userWhere,
        },
      });

      const totalSent = await prisma.scheduledEmail.count({
        where: {
          status: 'SENT',
          ...userWhere,
        },
      });

      const totalFailed = await prisma.scheduledEmail.count({
        where: {
          status: 'FAILED',
          ...userWhere,
        },
      });

      const rateLimitHits = await prisma.rateLimitLog.count({
        where: {
          hitLimit: true,
          ...(userEmail ? { senderEmail: userEmail } : {}),
        },
      });

      return res.json({
        bullMQ: jobCounts,
        dbCounts: {
          scheduled: totalScheduled,
          sent: totalSent,
          failed: totalFailed,
          rateLimitHits,
        },
        worker: {
          concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
          minDelayMs: parseInt(process.env.MIN_EMAIL_DELAY_MS || '2000', 10),
          defaultHourlyLimit: parseInt(process.env.DEFAULT_HOURLY_LIMIT || '200', 10),
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
