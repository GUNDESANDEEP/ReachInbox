import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';
export const ADMIN_BOARD_URL = (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:5002') + '/admin/queues';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export const isStaticMode = () =>
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('github.io') || window.location.hostname.includes('vercel.app'));

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

// Persistent Store for Static Demo Hosting & Offline Fallback Mode
let mockScheduledStore: ScheduledEmailItem[] = [];
let mockSentStore: ScheduledEmailItem[] = [];

export const getMockScheduledStore = (): ScheduledEmailItem[] => {
  if (typeof window === 'undefined') return mockScheduledStore;
  try {
    const raw = localStorage.getItem('reachinbox_mock_scheduled');
    if (raw) {
      mockScheduledStore = JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse mockScheduledStore from localStorage', e);
  }
  return mockScheduledStore;
};

export const saveMockScheduledStore = (items: ScheduledEmailItem[]) => {
  mockScheduledStore = items;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('reachinbox_mock_scheduled', JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save mockScheduledStore to localStorage', e);
    }
  }
};

export const getMockSentStore = (): ScheduledEmailItem[] => {
  if (typeof window === 'undefined') return mockSentStore;
  try {
    const raw = localStorage.getItem('reachinbox_mock_sent');
    if (raw) {
      mockSentStore = JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse mockSentStore from localStorage', e);
  }
  return mockSentStore;
};

export const saveMockSentStore = (items: ScheduledEmailItem[]) => {
  mockSentStore = items;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('reachinbox_mock_sent', JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save mockSentStore to localStorage', e);
    }
  }
};

export const processMockEmails = () => {
  const scheduled = getMockScheduledStore();
  const sent = getMockSentStore();
  const now = new Date();

  const remainingScheduled: ScheduledEmailItem[] = [];
  let updatedSent = [...sent];
  let changed = false;

  for (const item of scheduled) {
    const schedDate = new Date(item.scheduledFor);
    if (schedDate <= now && item.status === 'PENDING') {
      changed = true;
      updatedSent.unshift({
        ...item,
        status: 'SENT',
        sentAt: now.toISOString(),
        etherealPreviewUrl: item.etherealPreviewUrl || `https://ethereal.email/message/${item.id}`,
      });
    } else {
      remainingScheduled.push(item);
    }
  }

  if (changed) {
    saveMockScheduledStore(remainingScheduled);
    saveMockSentStore(updatedSent);
  }
};

// API Calls with Smart Static & Offline Fallback Persistence Handling
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
  const handleLocalFallback = () => {
    const scheduled = getMockScheduledStore();
    const targetDate = payload.scheduledFor ? new Date(payload.scheduledFor) : new Date();
    payload.recipients.forEach((rec, idx) => {
      scheduled.unshift({
        id: `sched_${Date.now()}_${idx}`,
        senderEmail: payload.senderEmail,
        recipientEmail: rec,
        subject: payload.subject,
        body: payload.body,
        scheduledFor: new Date(targetDate.getTime() + idx * (payload.delayMs || 2000)).toISOString(),
        delayMs: payload.delayMs || 2000,
        hourlyLimit: payload.hourlyLimit || 200,
        status: 'PENDING',
        idempotencyKey: `email_${payload.senderEmail}_${rec}_${Date.now()}_${idx}`,
        createdAt: new Date().toISOString(),
      });
    });
    saveMockScheduledStore(scheduled);
    return {
      message: `Successfully scheduled ${payload.recipients.length} email(s)`,
      scheduledCount: payload.recipients.length,
      scheduledFor: targetDate.toISOString(),
    };
  };

  if (isStaticMode()) {
    return handleLocalFallback();
  }
  try {
    const res = await api.post('/schedule', payload);
    return res.data;
  } catch (err) {
    return handleLocalFallback();
  }
};

export const fetchScheduledEmails = async (userEmail?: string): Promise<{ items: ScheduledEmailItem[]; total: number }> => {
  const activeEmail = userEmail || (typeof localStorage !== 'undefined' ? localStorage.getItem('reachinbox_user_email') : null);

  const getFilteredScheduled = () => {
    processMockEmails();
    let items = getMockScheduledStore();
    if (activeEmail) {
      const lower = activeEmail.toLowerCase();
      items = items.filter((item) => item.senderEmail?.toLowerCase() === lower || item.recipientEmail?.toLowerCase() === lower);
    } else {
      items = [];
    }
    return { items, total: items.length };
  };

  if (isStaticMode()) {
    return getFilteredScheduled();
  }
  try {
    const res = await api.get('/emails/scheduled', { params: { userEmail: activeEmail } });
    return res.data;
  } catch (err) {
    return getFilteredScheduled();
  }
};

export const fetchSentEmails = async (userEmail?: string): Promise<{ items: ScheduledEmailItem[]; total: number }> => {
  const activeEmail = userEmail || (typeof localStorage !== 'undefined' ? localStorage.getItem('reachinbox_user_email') : null);

  const getFilteredSent = () => {
    processMockEmails();
    let items = getMockSentStore();
    if (activeEmail) {
      const lower = activeEmail.toLowerCase();
      items = items.filter((item) => item.senderEmail?.toLowerCase() === lower || item.recipientEmail?.toLowerCase() === lower);
    } else {
      items = [];
    }
    return { items, total: items.length };
  };

  if (isStaticMode()) {
    return getFilteredSent();
  }
  try {
    const res = await api.get('/emails/sent', { params: { userEmail: activeEmail } });
    return res.data;
  } catch (err) {
    return getFilteredSent();
  }
};

export const searchEmailsApi = async (query: string, status = 'ALL', userEmail?: string): Promise<{ items: ScheduledEmailItem[]; total: number; source: string }> => {
  const activeEmail = userEmail || (typeof localStorage !== 'undefined' ? localStorage.getItem('reachinbox_user_email') : null);

  const handleLocalSearch = () => {
    processMockEmails();
    let all = [...getMockScheduledStore(), ...getMockSentStore()];
    if (activeEmail) {
      const lowerUser = activeEmail.toLowerCase();
      all = all.filter((item) => item.senderEmail?.toLowerCase() === lowerUser || item.recipientEmail?.toLowerCase() === lowerUser);
    } else {
      all = [];
    }
    const q = query.toLowerCase();
    const filtered = all.filter((item) => {
      const matchQ = !q || item.subject.toLowerCase().includes(q) || item.body.toLowerCase().includes(q) || item.recipientEmail.toLowerCase().includes(q);
      const matchStatus = status === 'ALL' || item.status === status;
      return matchQ && matchStatus;
    });
    return { items: filtered, total: filtered.length, source: 'database' };
  };

  if (isStaticMode()) {
    return handleLocalSearch();
  }
  try {
    const res = await api.get('/emails/search', { params: { q: query, status, userEmail: activeEmail } });
    return res.data;
  } catch (err) {
    return handleLocalSearch();
  }
};

export const cancelScheduledEmailApi = async (id: string) => {
  const handleLocalDelete = () => {
    const scheduled = getMockScheduledStore().filter((item) => item.id !== id);
    const sent = getMockSentStore().filter((item) => item.id !== id);
    saveMockScheduledStore(scheduled);
    saveMockSentStore(sent);
    return { message: 'Email schedule cancelled successfully', id };
  };

  if (isStaticMode()) {
    return handleLocalDelete();
  }
  try {
    const res = await api.delete(`/emails/${id}`);
    handleLocalDelete();
    return res.data;
  } catch (err) {
    return handleLocalDelete();
  }
};

export const fetchQueueStats = async (userEmail?: string): Promise<QueueStats> => {
  const activeEmail = userEmail || (typeof localStorage !== 'undefined' ? localStorage.getItem('reachinbox_user_email') : null);

  const getLocalStats = (): QueueStats => {
    processMockEmails();
    let scheduled = getMockScheduledStore();
    let sent = getMockSentStore();
    if (activeEmail) {
      const lower = activeEmail.toLowerCase();
      scheduled = scheduled.filter((item) => item.senderEmail?.toLowerCase() === lower || item.recipientEmail?.toLowerCase() === lower);
      sent = sent.filter((item) => item.senderEmail?.toLowerCase() === lower || item.recipientEmail?.toLowerCase() === lower);
    } else {
      scheduled = [];
      sent = [];
    }
    return {
      bullMQ: {
        active: scheduled.filter((s) => s.status === 'PROCESSING').length,
        completed: sent.length,
        failed: sent.filter((s) => s.status === 'FAILED').length,
        delayed: scheduled.filter((s) => s.status === 'PENDING' || s.status === 'RATE_LIMITED').length,
        waiting: 0,
        paused: 0,
      },
      dbCounts: {
        scheduled: scheduled.length,
        sent: sent.length,
        failed: sent.filter((s) => s.status === 'FAILED').length,
        rateLimitHits: scheduled.filter((s) => s.status === 'RATE_LIMITED').length,
      },
      worker: {
        concurrency: 5,
        minDelayMs: 2000,
        defaultHourlyLimit: 200,
      },
    };
  };

  if (isStaticMode()) {
    return getLocalStats();
  }
  try {
    const res = await api.get('/queue/stats', { params: { userEmail: activeEmail } });
    return res.data;
  } catch (err) {
    return getLocalStats();
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
  const res = await api.post('/auth/send-otp', user);
  return res.data;
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
  const res = await api.post('/auth/verify-otp', payload);
  return res.data;
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
  const res = await api.post('/auth/register', user);
  return res.data;
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
  const res = await api.post('/auth/login', user);
  return res.data;
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
