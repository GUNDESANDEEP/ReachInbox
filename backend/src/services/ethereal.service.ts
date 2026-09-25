import nodemailer from 'nodemailer';
import { prisma } from '../config/db';

interface TransporterCache {
  [senderEmail: string]: nodemailer.Transporter;
}

const transporterCache: TransporterCache = {};

export class EtherealService {
  static clearCache() {
    for (const key in transporterCache) {
      delete transporterCache[key];
    }
  }
  /**
   * Get or create a Nodemailer transporter (Brevo SMTP or Ethereal Fake SMTP fallback)
   */
  static async getTransporter(senderEmail: string): Promise<{ transporter: nodemailer.Transporter; senderEmail: string; isBrevo: boolean }> {
    if (transporterCache[senderEmail]) {
      const isBrevo = !!(process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_KEY);
      return { transporter: transporterCache[senderEmail], senderEmail, isBrevo };
    }

    // Check Gmail SMTP credentials in environment
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (gmailUser && gmailPass) {
      console.log(`✉️ Using Gmail Live SMTP for sender: ${senderEmail}`);
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });

      transporterCache[senderEmail] = transporter;
      return { transporter, senderEmail, isBrevo: true };
    }

    // Check if Brevo SMTP credentials are set in environment
    const brevoUser = process.env.BREVO_SMTP_USER;
    const brevoKey = process.env.BREVO_SMTP_KEY;

    if (brevoUser && brevoKey) {
      console.log(`✉️ Using Brevo SMTP Relay (smtp-relay.brevo.com) for sender: ${senderEmail}`);
      const transporter = nodemailer.createTransport({
        host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
        port: parseInt(process.env.BREVO_SMTP_PORT || '587', 10),
        secure: false,
        auth: {
          user: brevoUser,
          pass: brevoKey,
        },
      });

      transporterCache[senderEmail] = transporter;
      return { transporter, senderEmail, isBrevo: true };
    }

    // Default to Ethereal Fake SMTP
    let sender = await prisma.sender.findUnique({
      where: { email: senderEmail },
    });

    if (!sender || !sender.etherealUser || !sender.etherealPass) {
      console.log(`🔨 Generating new Ethereal SMTP test account for sender: ${senderEmail}...`);
      const testAccount = await nodemailer.createTestAccount();
      
      if (sender) {
        sender = await prisma.sender.update({
          where: { email: senderEmail },
          data: {
            etherealUser: testAccount.user,
            etherealPass: testAccount.pass,
          },
        });
      } else {
        sender = await prisma.sender.create({
          data: {
            name: senderEmail.split('@')[0] || 'ReachInbox Sender',
            email: senderEmail,
            etherealUser: testAccount.user,
            etherealPass: testAccount.pass,
          },
        });
      }
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: sender.etherealUser!,
        pass: sender.etherealPass!,
      },
    });

    transporterCache[senderEmail] = transporter;
    return { transporter, senderEmail, isBrevo: false };
  }

  /**
   * Send an email via Brevo SMTP or Ethereal SMTP (with automatic Ethereal fallback on SMTP auth error)
   */
  static async sendEmail(params: {
    senderEmail: string;
    recipientEmail: string;
    subject: string;
    body: string;
  }): Promise<{ messageId: string; previewUrl: string | false }> {
    const { transporter, isBrevo } = await this.getTransporter(params.senderEmail);

    try {
      const info = await transporter.sendMail({
        from: `"ReachInbox Campaign" <${params.senderEmail}>`,
        to: params.recipientEmail,
        subject: params.subject,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f9; color: #1e293b;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
              <h2 style="color: #4f46e5; margin-top: 0;">${params.subject}</h2>
              <div style="font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${params.body}</div>
              <hr style="margin-top: 24px; border: none; border-top: 1px solid #e2e8f0;" />
              <p style="font-size: 12px; color: #64748b; text-align: center;">
                Sent via <strong>ReachInbox Job Scheduler</strong> (${isBrevo ? 'Brevo Live SMTP' : 'Ethereal Fake SMTP'})
              </p>
            </div>
          </div>
        `,
      });

      const previewUrl = isBrevo ? false : nodemailer.getTestMessageUrl(info);
      console.log(`📨 Email sent to ${params.recipientEmail} via ${isBrevo ? 'Brevo Live SMTP' : 'Ethereal SMTP'}. ${previewUrl ? 'Preview: ' + previewUrl : ''}`);

      return {
        messageId: info.messageId,
        previewUrl: previewUrl || false,
      };
    } catch (primaryError: any) {
      console.warn(`⚠️ Primary SMTP send failed (${primaryError?.message}). Falling back to Ethereal SMTP test account...`);

      // Clear transporter cache to generate fresh Ethereal test account
      delete transporterCache[params.senderEmail];
      const testAccount = await nodemailer.createTestAccount();
      const etherealTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      const info = await etherealTransporter.sendMail({
        from: `"ReachInbox Campaign" <${params.senderEmail}>`,
        to: params.recipientEmail,
        subject: params.subject,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f9; color: #1e293b;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
              <h2 style="color: #4f46e5; margin-top: 0;">${params.subject}</h2>
              <div style="font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${params.body}</div>
              <hr style="margin-top: 24px; border: none; border-top: 1px solid #e2e8f0;" />
              <p style="font-size: 12px; color: #64748b; text-align: center;">
                Sent via <strong>ReachInbox Job Scheduler</strong> (Ethereal Fallback SMTP)
              </p>
            </div>
          </div>
        `,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`📨 Email sent to ${params.recipientEmail} via Ethereal Fallback SMTP. Preview: ${previewUrl}`);

      return {
        messageId: info.messageId,
        previewUrl: previewUrl || false,
      };
    }
  }
}

