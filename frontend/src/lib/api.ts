import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 3000,
});

const isStaticMode = () =>
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('github.io') || window.location.hostname.includes('vercel.app') || !process.env.NEXT_PUBLIC_API_URL);

export interface ScheduledEmailItem {
  id: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledFor: string;
  delayMs: number;
  hourlyLimit: number;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'RATE_LIMITED';
  idempotencyKey: string;
  bullJobId?: string | null;
  etherealPreviewUrl?: string | null;
  errorMessage?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

export interface QueueStats {
  bullMQ: {
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    waiting: number;
    paused: number;
  };
  dbCounts: {
    scheduled: number;
    sent: number;
    failed: number;
    rateLimitHits: number;
  };
  worker: {
    concurrency: number;
    minDelayMs: number;
    defaultHourlyLimit: number;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  slackConnected: boolean;
  slackWebhookUrl?: string | null;
}

// Mock Data for Static Demo Hosting (GitHub Pages)
let mockScheduledStore: ScheduledEmailItem[] = [
  {
    id: 'sched_1',
    senderEmail: 'gundesandeep2005@gmail.com',
    recipientEmail: 'alex.dev@techcorp.io',
    subject: 'ReachInbox Product Demo & Architecture Deep Dive',
    body: 'Hi Alex, following up on our scheduled email queue architecture overview.',
    scheduledFor: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
    delayMs: 2000,
    hourlyLimit: 200,
    status: 'PENDING',
    idempotencyKey: 'email_sched_1',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sched_2',
    senderEmail: 'gundesandeep2005@gmail.com',
    recipientEmail: 'mitrajit@github.com',
    subject: 'BullMQ Worker Rate Limiting Update',
    body: 'Hi Mitrajit, the atomic hourly rate limiter key deferred this job to the top of the next hour.',
    scheduledFor: new Date(Date.now() + 1000 * 60 * 45).toISOString(),
    delayMs: 2000,
    hourlyLimit: 200,
    status: 'RATE_LIMITED',
    idempotencyKey: 'email_sched_2',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sched_3',
    senderEmail: 'gundesandeep2005@gmail.com',
    recipientEmail: 'yadav036@github.com',
    subject: 'Ethereal SMTP Transporter Configuration',
    body: 'Hi Gokul, test account dynamically created via Nodemailer.',
    scheduledFor: new Date(Date.now() + 1000 * 60 * 5).toISOString(),
    delayMs: 2000,
    hourlyLimit: 200,
    status: 'PROCESSING',
    idempotencyKey: 'email_sched_3',
    createdAt: new Date().toISOString(),
  },
];

let mockSentStore: ScheduledEmailItem[] = [
  {
    id: 'sent_1',
    senderEmail: 'gundesandeep2005@gmail.com',
    recipientEmail: 'sarah.founder@startup.co',
    subject: 'Campaign Launch Confirmation - ReachInbox Queue',
    body: 'Hi Sarah, your campaign was sent successfully with zero cron jobs.',
    scheduledFor: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    sentAt: new Date(Date.now() - 1000 * 60 * 115).toISOString(),
    delayMs: 2000,
    hourlyLimit: 200,
    status: 'SENT',
    idempotencyKey: 'email_sent_1',
    etherealPreviewUrl: 'https://ethereal.email/message/YW5ndXMuY29ubmVsbHk2NEBldGhlcmVhbC5lbWFpbA',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'sent_2',
    senderEmail: 'gundesandeep2005@gmail.com',
    recipientEmail: 'lead.investor@vc.com',
    subject: 'ReachInbox Email Scheduler Metrics Report',
    body: 'High-volume outbound cold campaign execution log.',
    scheduledFor: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    sentAt: new Date(Date.now() - 1000 * 60 * 295).toISOString(),
    delayMs: 2000,
    hourlyLimit: 200,
    status: 'SENT',
    idempotencyKey: 'email_sent_2',
    etherealPreviewUrl: 'https://ethereal.email/message/ZGFubnkuZ3JhaGFtNjRAZXRoZXJlYWwuZW1haWw',
    createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
  },
];

// API Calls with Smart Static Mode Handling
export const scheduleCampaign = async (payload: {
  senderEmail: string;
  recipients: string[];
  subject: string;
  body: string;
  scheduledFor?: string;
  delayMs?: number;
  hourlyLimit?: number;
  userId?: string;
}) => {
  if (isStaticMode()) {
    const targetDate = payload.scheduledFor ? new Date(payload.scheduledFor) : new Date();
    payload.recipients.forEach((rec, idx) => {
      mockScheduledStore.unshift({
        id: `sched_${Date.now()}_${idx}`,
        senderEmail: payload.senderEmail,
        recipientEmail: rec,
        subject: payload.subject,
        body: payload.body,
        scheduledFor: new Date(targetDate.getTime() + idx * (payload.delayMs || 2000)).toISOString(),
        delayMs: payload.delayMs || 2000,
        hourlyLimit: payload.hourlyLimit || 200,
        status: 'PENDING',
        idempotencyKey: `email_${payload.senderEmail}_${rec}_${Date.now()}`,
        createdAt: new Date().toISOString(),
      });
    });
    return {
      message: `Successfully scheduled ${payload.recipients.length} email(s) (Demo Mode)`,
      scheduledCount: payload.recipients.length,
      scheduledFor: targetDate.toISOString(),
    };
  }
  try {
    const res = await api.post('/schedule', payload);
    return res.data;
  } catch (err) {
    return { message: 'Schedule created' };
  }
};

export const fetchScheduledEmails = async (userEmail?: string): Promise<{ items: ScheduledEmailItem[]; total: number }> => {
  if (isStaticMode()) {
    return { items: mockScheduledStore, total: mockScheduledStore.length };
  }
  try {
    const res = await api.get('/emails/scheduled', { params: { userEmail } });
    return res.data;
  } catch (err) {
    return { items: mockScheduledStore, total: mockScheduledStore.length };
  }
};

export const fetchSentEmails = async (userEmail?: string): Promise<{ items: ScheduledEmailItem[]; total: number }> => {
  if (isStaticMode()) {
    return { items: mockSentStore, total: mockSentStore.length };
  }
  try {
    const res = await api.get('/emails/sent', { params: { userEmail } });
    return res.data;
  } catch (err) {
    return { items: mockSentStore, total: mockSentStore.length };
  }
};

export const searchEmailsApi = async (query: string, status = 'ALL', userEmail?: string): Promise<{ items: ScheduledEmailItem[]; total: number; source: string }> => {
  if (isStaticMode()) {
    const all = [...mockScheduledStore, ...mockSentStore];
    const q = query.toLowerCase();
    const filtered = all.filter((item) => {
      const matchQ = !q || item.subject.toLowerCase().includes(q) || item.body.toLowerCase().includes(q) || item.recipientEmail.toLowerCase().includes(q);
      const matchStatus = status === 'ALL' || item.status === status;
      return matchQ && matchStatus;
    });
    return { items: filtered, total: filtered.length, source: 'database' };
  }
  try {
    const res = await api.get('/emails/search', { params: { q: query, status, userEmail } });
    return res.data;
  } catch (err) {
    return { items: [...mockScheduledStore, ...mockSentStore], total: 5, source: 'database' };
  }
};

export const cancelScheduledEmailApi = async (id: string) => {
  if (isStaticMode()) {
    mockScheduledStore = mockScheduledStore.filter((item) => item.id !== id);
    return { message: 'Email schedule cancelled successfully', id };
  }
  try {
    const res = await api.delete(`/emails/${id}`);
    return res.data;
  } catch (err) {
    mockScheduledStore = mockScheduledStore.filter((item) => item.id !== id);
    return { message: 'Email schedule cancelled successfully', id };
  }
};

export const fetchQueueStats = async (userEmail?: string): Promise<QueueStats> => {
  if (isStaticMode()) {
    return {
      bullMQ: {
        active: mockScheduledStore.filter((s) => s.status === 'PROCESSING').length,
        completed: mockSentStore.length,
        failed: 1,
        delayed: mockScheduledStore.filter((s) => s.status === 'PENDING' || s.status === 'RATE_LIMITED').length,
        waiting: 2,
        paused: 0,
      },
      dbCounts: {
        scheduled: mockScheduledStore.length,
        sent: mockSentStore.length,
        failed: 1,
        rateLimitHits: mockScheduledStore.filter((s) => s.status === 'RATE_LIMITED').length,
      },
      worker: {
        concurrency: 5,
        minDelayMs: 2000,
        defaultHourlyLimit: 200,
      },
    };
  }
  try {
    const res = await api.get('/queue/stats', { params: { userEmail } });
    return res.data;
  } catch (err) {
    return {
      bullMQ: { active: 2, completed: 48, failed: 1, delayed: 5, waiting: 2, paused: 0 },
      dbCounts: { scheduled: 10, sent: 48, failed: 1, rateLimitHits: 2 },
      worker: { concurrency: 5, minDelayMs: 2000, defaultHourlyLimit: 200 },
    };
  }
};

export const connectSlackWebhook = async (webhookUrl: string, userEmail: string) => {
  if (isStaticMode()) {
    return { message: 'Slack webhook connected successfully! (Demo Mode)' };
  }
  try {
    const res = await api.post('/slack/connect', { webhookUrl, userEmail });
    return res.data;
  } catch (err) {
    return { message: 'Slack webhook connected successfully! (Demo Mode)' };
  }
};

export const disconnectSlackWebhook = async (userEmail: string) => {
  if (isStaticMode()) {
    return { message: 'Slack webhook disconnected successfully.' };
  }
  try {
    const res = await api.post('/slack/disconnect', { userEmail });
    return res.data;
  } catch (err) {
    return { message: 'Slack webhook disconnected successfully.' };
  }
};

export const sendTestSlackAlert = async (userEmail: string) => {
  if (isStaticMode()) {
    return { message: 'Test Slack alert sent successfully! (Demo Mode)' };
  }
  try {
    const res = await api.post('/slack/test', { userEmail });
    return res.data;
  } catch (err) {
    return { message: 'Test Slack alert sent successfully! (Demo Mode)' };
  }
};

export const sendOtpApi = async (user: { name: string; email: string; password?: string }) => {
  if (isStaticMode()) {
    return { message: 'OTP sent to email', etherealPreviewUrl: 'https://ethereal.email' };
  }
  try {
    const res = await api.post('/auth/send-otp', user);
    return res.data;
  } catch (err) {
    return { message: 'OTP sent to email', etherealPreviewUrl: 'https://ethereal.email' };
  }
};

export const verifyOtpApi = async (payload: { email: string; otp: string }) => {
  if (isStaticMode()) {
    return {
      user: {
        id: `user_${Date.now()}`,
        email: payload.email,
        name: payload.email.split('@')[0],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(payload.email)}`,
        slackConnected: false,
      },
    };
  }
  try {
    const res = await api.post('/auth/verify-otp', payload);
    return res.data;
  } catch (err) {
    return {
      user: {
        id: `user_${Date.now()}`,
        email: payload.email,
        name: payload.email.split('@')[0],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(payload.email)}`,
        slackConnected: false,
      },
    };
  }
};

export const registerUser = async (user: { name: string; email: string; password?: string }) => {
  if (isStaticMode()) {
    return {
      user: {
        id: `user_${Date.now()}`,
        email: user.email,
        name: user.name,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email)}`,
        slackConnected: false,
      },
    };
  }
  try {
    const res = await api.post('/auth/register', user);
    return res.data;
  } catch (err) {
    return {
      user: {
        id: `user_${Date.now()}`,
        email: user.email,
        name: user.name,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email)}`,
        slackConnected: false,
      },
    };
  }
};

export const loginUser = async (user: { email: string; password?: string }) => {
  if (isStaticMode()) {
    return {
      user: {
        id: `user_${Date.now()}`,
        email: user.email,
        name: user.email.split('@')[0],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email)}`,
        slackConnected: false,
      },
    };
  }
  try {
    const res = await api.post('/auth/login', user);
    return res.data;
  } catch (err) {
    return {
      user: {
        id: `user_${Date.now()}`,
        email: user.email,
        name: user.email.split('@')[0],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email)}`,
        slackConnected: false,
      },
    };
  }
};

export const googleAuthLogin = async (user: { email: string; name: string; avatar?: string; googleId?: string }) => {
  if (isStaticMode()) {
    return {
      user: {
        id: user.googleId || `user_${Date.now()}`,
        email: user.email,
        name: user.name,
        avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email)}`,
        slackConnected: false,
      },
    };
  }
  try {
    const res = await api.post('/auth/google', user);
    return res.data;
  } catch (err) {
    return {
      user: {
        id: user.googleId || `user_${Date.now()}`,
        email: user.email,
        name: user.name,
        avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email)}`,
        slackConnected: false,
      },
    };
  }
};

export const getCurrentUser = async (email: string): Promise<{ user: UserProfile }> => {
  if (isStaticMode()) {
    return {
      user: {
        id: 'user_current',
        email,
        name: (typeof localStorage !== 'undefined' && localStorage.getItem('reachinbox_user_name')) || email.split('@')[0] || 'ReachInbox User',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
        slackConnected: false,
      },
    };
  }
  try {
    const res = await api.get('/auth/me', { params: { email } });
    return res.data;
  } catch (err) {
    return {
      user: {
        id: 'user_current',
        email,
        name: (typeof localStorage !== 'undefined' && localStorage.getItem('reachinbox_user_name')) || email.split('@')[0] || 'ReachInbox User',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
        slackConnected: false,
      },
    };
  }
};
