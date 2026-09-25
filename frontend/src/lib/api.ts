import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// API Calls
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
  const res = await api.post('/schedule', payload);
  return res.data;
};

export const fetchScheduledEmails = async (userEmail?: string): Promise<{ items: ScheduledEmailItem[]; total: number }> => {
  const res = await api.get('/emails/scheduled', { params: { userEmail } });
  return res.data;
};

export const fetchSentEmails = async (userEmail?: string): Promise<{ items: ScheduledEmailItem[]; total: number }> => {
  const res = await api.get('/emails/sent', { params: { userEmail } });
  return res.data;
};

export const searchEmailsApi = async (query: string, status = 'ALL', userEmail?: string): Promise<{ items: ScheduledEmailItem[]; total: number; source: string }> => {
  const res = await api.get('/emails/search', { params: { q: query, status, userEmail } });
  return res.data;
};

export const cancelScheduledEmailApi = async (id: string) => {
  const res = await api.delete(`/emails/${id}`);
  return res.data;
};

export const fetchQueueStats = async (userEmail?: string): Promise<QueueStats> => {
  const res = await api.get('/queue/stats', { params: { userEmail } });
  return res.data;
};

export const connectSlackWebhook = async (webhookUrl: string, userEmail: string) => {
  const res = await api.post('/slack/connect', { webhookUrl, userEmail });
  return res.data;
};

export const disconnectSlackWebhook = async (userEmail: string) => {
  const res = await api.post('/slack/disconnect', { userEmail });
  return res.data;
};

export const sendTestSlackAlert = async (userEmail: string) => {
  const res = await api.post('/slack/test', { userEmail });
  return res.data;
};

export const sendOtpApi = async (user: { name: string; email: string; password?: string }) => {
  const res = await api.post('/auth/send-otp', user);
  return res.data;
};

export const verifyOtpApi = async (payload: { email: string; otp: string }) => {
  const res = await api.post('/auth/verify-otp', payload);
  return res.data;
};

export const registerUser = async (user: { name: string; email: string; password?: string }) => {
  const res = await api.post('/auth/register', user);
  return res.data;
};

export const loginUser = async (user: { email: string; password?: string }) => {
  const res = await api.post('/auth/login', user);
  return res.data;
};

export const googleAuthLogin = async (user: { email: string; name: string; avatar?: string; googleId?: string }) => {
  const res = await api.post('/auth/google', user);
  return res.data;
};

export const getCurrentUser = async (email: string): Promise<{ user: UserProfile }> => {
  const res = await api.get('/auth/me', { params: { email } });
  return res.data;
};
