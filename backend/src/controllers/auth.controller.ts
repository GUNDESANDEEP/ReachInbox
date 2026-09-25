import { Request, Response } from 'express';
import { prisma } from '../config/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ENV } from '../config/env';
import { EtherealService } from '../services/ethereal.service';

interface PendingOtpRecord {
  name: string;
  email: string;
  hashedPassword: string;
  otp: string;
  expiresAt: number;
}

const pendingOtps = new Map<string, PendingOtpRecord>();

export class AuthController {
  /**
   * POST /api/auth/send-otp
   * Generate 6-digit OTP, send via email, and store pending signup details
   */
  static async sendOtp(req: Request, res: Response) {
    try {
      const { name, email, password } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }

      const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (existingUser) {
        return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
      }

      // Generate 6-digit random numeric OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedPassword = await bcrypt.hash(password, 10);
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

      pendingOtps.set(email.toLowerCase(), {
        name,
        email: email.toLowerCase(),
        hashedPassword,
        otp,
        expiresAt,
      });

      // Send OTP via Ethereal / SMTP
      let etherealPreviewUrl: string | false = false;
      try {
        const emailRes = await EtherealService.sendEmail({
          senderEmail: 'verify@reachinbox.com',
          recipientEmail: email,
          subject: `🔐 Verify Your ReachInbox Account - OTP: ${otp}`,
          body: `Hi ${name},\n\nYour 6-digit One-Time Password (OTP) for creating your ReachInbox account is:\n\n${otp}\n\nThis code will expire in 10 minutes. Please enter this code on the registration page to activate your account.\n\nThank you,\nReachInbox Team`,
        });
        etherealPreviewUrl = emailRes.previewUrl;
      } catch (mailErr) {
        console.warn('Failed to dispatch OTP email via SMTP:', mailErr);
      }

      console.log(`🔑 [SECURITY] OTP verification code dispatched to email (${email}): ${otp}`);

      return res.json({
        message: '6-digit OTP code sent to your email address!',
        email,
        etherealPreviewUrl,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/auth/verify-otp
   * Validate 6-digit OTP and complete account creation
   */
  static async verifyOtp(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP code are required' });
      }

      const record = pendingOtps.get(email.toLowerCase());

      if (!record) {
        return res.status(400).json({ error: 'No pending registration found for this email. Please request a new OTP.' });
      }

      if (Date.now() > record.expiresAt) {
        pendingOtps.delete(email.toLowerCase());
        return res.status(400).json({ error: 'OTP code has expired. Please request a new verification code.' });
      }

      if (record.otp !== otp.trim()) {
        return res.status(400).json({ error: 'Invalid OTP verification code. Please check and try again.' });
      }

      // Check one more time if user exists
      const existingUser = await prisma.user.findUnique({ where: { email: record.email } });
      if (existingUser) {
        pendingOtps.delete(email.toLowerCase());
        return res.status(400).json({ error: 'Account already created for this email.' });
      }

      // Create User in DB
      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(record.email)}`;
      const user = await prisma.user.create({
        data: {
          name: record.name,
          email: record.email,
          password: record.hashedPassword,
          avatar,
        },
      });

      // Delete OTP record from memory
      pendingOtps.delete(email.toLowerCase());

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        ENV.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        message: 'Account verified & created successfully!',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          slackConnected: !!user.slackWebhookUrl,
          slackWebhookUrl: user.slackWebhookUrl,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/auth/register
   * Direct Create account (fallback)
   */
  static async register(req: Request, res: Response) {
    try {
      const { name, email, password } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`;

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          avatar,
        },
      });

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        ENV.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        message: 'Account created successfully!',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          slackConnected: !!user.slackWebhookUrl,
          slackWebhookUrl: user.slackWebhookUrl,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/auth/login
   * Sign in with Email + Password
   */
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({ error: 'No account found with this email. Please sign up.' });
      }

      if (user.password) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
        }
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        ENV.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        message: 'Signed in successfully!',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          slackConnected: !!user.slackWebhookUrl,
          slackWebhookUrl: user.slackWebhookUrl,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/auth/google
   * Authenticate/sync user profile from Google OAuth flow
   */
  static async googleLogin(req: Request, res: Response) {
    try {
      const { email, name, avatar, googleId } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required for authentication' });
      }

      const user = await prisma.user.upsert({
        where: { email },
        update: {
          name: name || email.split('@')[0],
          avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
          googleId,
        },
        create: {
          email,
          name: name || email.split('@')[0],
          avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
          googleId,
        },
      });

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        ENV.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          slackConnected: !!user.slackWebhookUrl,
          slackWebhookUrl: user.slackWebhookUrl,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/auth/me
   */
  static async getMe(req: Request, res: Response) {
    try {
      const email = (req.query.email as string) || 'demo@reachinbox.com';

      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: email.split('@')[0] || 'ReachInbox User',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
          },
        });
      }

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          slackConnected: !!user.slackWebhookUrl,
          slackWebhookUrl: user.slackWebhookUrl,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
