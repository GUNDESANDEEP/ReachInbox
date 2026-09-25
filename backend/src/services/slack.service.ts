import axios from 'axios';
import { prisma } from '../config/db';

export class SlackService {
  /**
   * Send live Slack Notification when rate limit is hit
   */
  static async notifyRateLimitHit(params: {
    senderEmail: string;
    hourlyLimit: number;
    currentCount: number;
    nextResetTime: Date;
    deferredJobsCount: number;
    userId?: string;
  }): Promise<boolean> {
    const { senderEmail, hourlyLimit, currentCount, nextResetTime, deferredJobsCount, userId } = params;

    // Retrieve user's configured Slack Webhook URL or Bot Token
    let tokenOrWebhook: string | null = null;

    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      tokenOrWebhook = user?.slackWebhookUrl || null;
    }

    if (!tokenOrWebhook) {
      const userWithSlack = await prisma.user.findFirst({
        where: { slackWebhookUrl: { not: null } },
      });
      tokenOrWebhook = userWithSlack?.slackWebhookUrl || null;
    }

    const resetTimeString = nextResetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 ReachInbox Email Rate Limit Alert',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Sender Email:*\n\`${senderEmail}\``,
          },
          {
            type: 'mrkdwn',
            text: `*Hourly Limit:*\n${hourlyLimit} emails / hr`,
          },
          {
            type: 'mrkdwn',
            text: `*Attempted Count:*\n*${currentCount}* emails`,
          },
          {
            type: 'mrkdwn',
            text: `*Jobs Deferred:*\n*${deferredJobsCount}* email(s)`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⏰ *Action Taken*: Jobs have been automatically rescheduled preserving queue order. Next delivery window begins at *${resetTimeString}*.`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '🛡️ Powered by *ReachInbox Persistent BullMQ Rate Limiter*',
          },
        ],
      },
    ];

    if (!tokenOrWebhook) {
      console.warn(`⚠️ Slack notification skipped: No Slack Webhook/Token configured for ${senderEmail} (${currentCount}/${hourlyLimit}).`);
      return false;
    }

    try {
      const isBotToken = tokenOrWebhook.trim().startsWith('xoxb-');

      if (isBotToken) {
        // Send via Slack Web API chat.postMessage
        const response = await axios.post(
          'https://slack.com/api/chat.postMessage',
          {
            channel: 'general', // Default channel for Bot Tokens
            text: `🚨 *ReachInbox Rate Limit Alert*: Sender \`${senderEmail}\` reached hourly cap (${hourlyLimit} emails/hr)!`,
            blocks,
          },
          {
            headers: {
              Authorization: `Bearer ${tokenOrWebhook.trim()}`,
              'Content-Type': 'application/json',
            },
            timeout: 5000,
          }
        );

        console.log(`💬 Live Slack Alert sent via Bot Token for ${senderEmail}! Status: ${response.data.ok ? 'OK' : 'Error'}`);
        return response.data.ok;
      } else {
        // Send via Webhook URL
        const response = await axios.post(
          tokenOrWebhook,
          {
            text: `🚨 *ReachInbox Rate Limit Alert*: Sender \`${senderEmail}\` reached hourly cap (${hourlyLimit} emails/hr)!`,
            blocks,
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000,
          }
        );

        console.log(`💬 Live Slack Alert sent via Webhook for ${senderEmail}! Status: ${response.status}`);
        return true;
      }
    } catch (err: any) {
      console.error(`❌ Slack notification call failed for ${senderEmail}:`, err?.message || err);
      return false;
    }
  }
}
