import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { scheduleEmailJob } from '../queues/email.queue';
import { elasticsearchService } from '../services/elasticsearch.service';
import { EtherealService } from '../services/ethereal.service';

export class ScheduleController {
  /**
   * POST /api/schedule
   * Accepts campaign email schedule request
   */
  static async createSchedule(req: Request, res: Response) {
    try {
      const {
        senderEmail,
        recipients, // array of recipient email strings
        subject,
        body,
        scheduledFor,
        delayMs = 2000,
        hourlyLimit = 200,
        userId,
        userEmail,
      } = req.body;

      if (!senderEmail || !recipients || !Array.isArray(recipients) || recipients.length === 0 || !subject || !body) {
        return res.status(400).json({ error: 'Missing required parameters: senderEmail, recipients (array), subject, body' });
      }

      // Ensure sender exists in DB
      await EtherealService.getTransporter(senderEmail);

      const targetDate = scheduledFor ? new Date(scheduledFor) : new Date();

      // Ensure user exists in DB to prevent foreign key violation
      let targetUserId = userId;

      if (userEmail) {
        const user = await prisma.user.upsert({
          where: { email: userEmail },
          update: {},
          create: {
            email: userEmail,
            name: userEmail.split('@')[0] || 'ReachInbox User',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userEmail)}`,
          },
        });
        targetUserId = user.id;
      } else if (!targetUserId) {
        const defaultUser = await prisma.user.upsert({
          where: { email: 'demo@reachinbox.com' },
          update: {},
          create: {
            email: 'demo@reachinbox.com',
            name: 'ReachInbox User',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo@reachinbox.com',
          },
        });
        targetUserId = defaultUser.id;
      } else {
        // Verify targetUserId exists, else fallback to default user
        const existingUser = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!existingUser) {
          const fallbackUser = await prisma.user.upsert({
            where: { email: 'demo@reachinbox.com' },
            update: {},
            create: {
              email: 'demo@reachinbox.com',
              name: 'ReachInbox User',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo@reachinbox.com',
            },
          });
          targetUserId = fallbackUser.id;
        }
      }

      // Create Campaign container record safely
      const campaign = await prisma.campaign.create({
        data: {
          title: subject.substring(0, 50),
          userId: targetUserId,
        },
      });

      const scheduledJobs = [];

      // Loop through recipients & schedule BullMQ delayed jobs
      for (let i = 0; i < recipients.length; i++) {
        const recipientEmail = recipients[i].trim();
        if (!recipientEmail || !recipientEmail.includes('@')) continue;

        // Calculate staggered start time if multiple emails
        const itemScheduledFor = new Date(targetDate.getTime() + i * (delayMs || 2000));

        const jobResult = await scheduleEmailJob({
          senderEmail,
          recipientEmail,
          subject,
          body,
          scheduledFor: itemScheduledFor,
          delayMs: Number(delayMs),
          hourlyLimit: Number(hourlyLimit),
          campaignId: campaign.id,
          userId: targetUserId,
        });

        scheduledJobs.push(jobResult);
      }

      return res.status(201).json({
        message: `Successfully scheduled ${scheduledJobs.length} email(s)`,
        campaignId: campaign.id,
        scheduledCount: scheduledJobs.length,
        scheduledFor: targetDate.toISOString(),
      });
    } catch (err: any) {
      console.error('❌ Schedule API Error:', err);
      return res.status(500).json({ error: err.message || 'Failed to schedule emails' });
    }
  }

  /**
   * GET /api/emails/scheduled
   */
  static async getScheduledEmails(req: Request, res: Response) {
    try {
      const userEmail = (req.query.userEmail as string) || (req.query.email as string);
      
      const whereCondition: any = {
        status: { in: ['PENDING', 'PROCESSING', 'RATE_LIMITED'] },
      };

      if (userEmail) {
        whereCondition.OR = [
          { senderEmail: userEmail },
          { campaign: { user: { email: userEmail } } },
        ];
      }

      const scheduled = await prisma.scheduledEmail.findMany({
        where: whereCondition,
        orderBy: { scheduledFor: 'asc' },
        take: 100,
      });

      return res.json({ items: scheduled, total: scheduled.length });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/emails/sent
   */
  static async getSentEmails(req: Request, res: Response) {
    try {
      const userEmail = (req.query.userEmail as string) || (req.query.email as string);

      const whereCondition: any = {
        status: { in: ['SENT', 'FAILED'] },
      };

      if (userEmail) {
        whereCondition.OR = [
          { senderEmail: userEmail },
          { campaign: { user: { email: userEmail } } },
        ];
      }

      const sent = await prisma.scheduledEmail.findMany({
        where: whereCondition,
        orderBy: { sentAt: 'desc' },
        take: 100,
      });

      return res.json({ items: sent, total: sent.length });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/emails/search?q=query&status=ALL&userEmail=...
   */
  static async searchEmails(req: Request, res: Response) {
    try {
      const q = (req.query.q as string) || '';
      const status = (req.query.status as string) || 'ALL';
      const userEmail = (req.query.userEmail as string) || (req.query.email as string);

      const result = await elasticsearchService.searchEmails(q, status, userEmail);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/emails/elasticsearch-status
   * Explicit health check for configured Elasticsearch cluster
   */
  static async getElasticsearchStatus(_req: Request, res: Response) {
    try {
      const health = await elasticsearchService.getHealth();
      return res.json(health);
    } catch (err: any) {
      return res.status(500).json({ connected: false, error: err.message });
    }
  }

  /**
   * DELETE /api/emails/:id
   */
  static async cancelScheduledEmail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const record = await prisma.scheduledEmail.findUnique({ where: { id } });

      if (!record) {
        return res.status(404).json({ error: 'Scheduled email not found' });
      }

      await prisma.scheduledEmail.delete({ where: { id } });
      return res.json({ message: 'Email schedule cancelled successfully', id });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/config/smtp
   */
  static async updateSmtpConfig(req: Request, res: Response) {
    try {
      const { brevoUser, brevoKey } = req.body;
      if (!brevoUser || !brevoKey) {
        return res.status(400).json({ error: 'Missing required parameters: brevoUser, brevoKey' });
      }

      process.env.BREVO_SMTP_USER = brevoUser;
      process.env.BREVO_SMTP_KEY = brevoKey;
      EtherealService.clearCache();

      // Test new SMTP credentials
      const { transporter } = await EtherealService.getTransporter(brevoUser);
      await transporter.verify();

      return res.json({ message: 'Brevo SMTP credentials verified and saved successfully!' });
    } catch (err: any) {
      return res.status(400).json({ error: `Brevo SMTP verification failed: ${err.message}` });
    }
  }
}
