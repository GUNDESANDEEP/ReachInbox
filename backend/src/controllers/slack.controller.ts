import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { SlackService } from '../services/slack.service';

export class SlackController {
  /**
   * POST /api/slack/connect
   * Connect or update user's Slack Webhook URL / OAuth token
   */
  static async connectSlack(req: Request, res: Response) {
    try {
      const { webhookUrl, userId = 'demo-user-1', userEmail = 'user@reachinbox.com' } = req.body;

      if (!webhookUrl || typeof webhookUrl !== 'string') {
        return res.status(400).json({ error: 'Valid Slack webhook URL is required' });
      }

      // Upsert user profile with Slack webhook URL
      const user = await prisma.user.upsert({
        where: { email: userEmail },
        update: { slackWebhookUrl: webhookUrl },
        create: {
          id: userId,
          email: userEmail,
          name: userEmail.split('@')[0] || 'ReachInbox User',
          slackWebhookUrl: webhookUrl,
        },
      });

      console.log(`🔗 Slack Webhook connected for user: ${user.email}`);

      return res.json({
        message: 'Slack Webhook connected successfully!',
        slackConnected: true,
        user: {
          id: user.id,
          email: user.email,
          slackWebhookUrl: user.slackWebhookUrl,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/slack/disconnect
   */
  static async disconnectSlack(req: Request, res: Response) {
    try {
      const { userEmail = 'user@reachinbox.com' } = req.body;

      await prisma.user.updateMany({
        where: { email: userEmail },
        data: { slackWebhookUrl: null, slackAccessToken: null },
      });

      return res.json({ message: 'Slack disconnected successfully', slackConnected: false });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/slack/test
   * Trigger live test Slack alert to verify integration in dashboard
   */
  static async testSlackAlert(req: Request, res: Response) {
    try {
      const { userEmail = 'user@reachinbox.com' } = req.body;

      const user = await prisma.user.findFirst({
        where: { email: userEmail, slackWebhookUrl: { not: null } },
      });

      const webhookUrl = user?.slackWebhookUrl || req.body.webhookUrl;

      if (!webhookUrl) {
        return res.status(400).json({
          error: 'No Slack Webhook connected. Please click "Connect Slack" in the top bar first.',
        });
      }

      const success = await SlackService.notifyRateLimitHit({
        senderEmail: 'test-sender@reachinbox.com',
        hourlyLimit: 200,
        currentCount: 201,
        nextResetTime: new Date(Date.now() + 3600000),
        deferredJobsCount: 15,
      });

      if (success) {
        return res.json({ message: 'Live Slack test notification delivered successfully!' });
      } else {
        return res.status(500).json({ error: 'Failed to deliver message to Slack webhook' });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
