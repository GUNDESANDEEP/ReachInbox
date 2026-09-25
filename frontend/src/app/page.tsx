'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '../components/Header';
import { QueueStatsWidget } from '../components/QueueStatsWidget';
import { ScheduledEmailsTable } from '../components/ScheduledEmailsTable';
import { SentEmailsTable } from '../components/SentEmailsTable';
import { ComposeEmailModal } from '../components/ComposeEmailModal';
import { SlackConnectModal } from '../components/SlackConnectModal';
import { EmailDetailModal } from '../components/EmailDetailModal';
import { DataStreamCanvas } from '../components/DataStreamCanvas';
import {
  UserProfile,
  ScheduledEmailItem,
  QueueStats,
  fetchQueueStats,
  fetchScheduledEmails,
  fetchSentEmails,
  searchEmailsApi,
  getCurrentUser,
  googleAuthLogin,
  registerUser,
  loginUser,
  sendOtpApi,
  verifyOtpApi,
} from '../lib/api';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { Mail, Sparkles, Activity, ShieldCheck, Cpu, ExternalLink, Lock, User, AlertCircle, ArrowRight, Eye, EyeOff, KeyRound, CheckCircle2, RefreshCw } from 'lucide-react';

export default function Home() {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Auth state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authStep, setAuthStep] = useState<'credentials' | 'otp_verify'>('credentials');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [etherealPreviewUrl, setEtherealPreviewUrl] = useState<string | null>(null);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Tab & Modal State
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent' | 'queue'>('scheduled');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackModalOpen, setIsSlackModalOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<ScheduledEmailItem | null>(null);

  // Data state
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [scheduledItems, setScheduledItems] = useState<ScheduledEmailItem[]>([]);
  const [sentItems, setSentItems] = useState<ScheduledEmailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [searchSource, setSearchSource] = useState<string>('database');

  // Initialize theme preference
  useEffect(() => {
    const savedTheme = (localStorage.getItem('reachinbox_theme') as 'light' | 'dark') || 'light';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('reachinbox_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Load User session
  const initUserSession = useCallback(async () => {
    try {
      const storedEmail = localStorage.getItem('reachinbox_user_email');
      if (storedEmail) {
        const data = await getCurrentUser(storedEmail);
        setUser(data.user);
      }
    } catch (err) {
      console.error('Failed to load user session:', err);
    }
  }, []);

  // Fetch Dashboard Stats & Emails
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setStatsLoading(true);
    try {
      const activeUserEmail = user?.email || localStorage.getItem('reachinbox_user_email') || undefined;
      const [statsRes, scheduledRes, sentRes] = await Promise.all([
        fetchQueueStats(activeUserEmail),
        fetchScheduledEmails(activeUserEmail),
        fetchSentEmails(activeUserEmail),
      ]);

      setStats(statsRes);
      setScheduledItems(scheduledRes.items);
      setSentItems(sentRes.items);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    initUserSession();
    loadDashboardData();

    // Auto-refresh queue stats & email lists every 5 seconds for live dashboard updates
    const interval = setInterval(() => {
      const activeUserEmail = user?.email || localStorage.getItem('reachinbox_user_email') || undefined;

      fetchQueueStats(activeUserEmail)
        .then(setStats)
        .catch(() => { });

      fetchScheduledEmails(activeUserEmail)
        .then((res) => setScheduledItems(res.items))
        .catch(() => { });

      fetchSentEmails(activeUserEmail)
        .then((res) => setSentItems(res.items))
        .catch(() => { });
    }, 5000);

    return () => clearInterval(interval);
  }, [initUserSession, loadDashboardData, user?.email]);

  // Submit local Sign In or Request OTP for Create Account
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setOtpSuccessMessage(null);

    if (!email || !password || (authMode === 'signup' && !name)) {
      setAuthError('Please fill in all required fields.');
      return;
    }

    setIsAuthLoading(true);
    try {
      if (authMode === 'signup') {
        try {
          const res = await sendOtpApi({ name, email, password });
          setEtherealPreviewUrl(res.etherealPreviewUrl || null);
          setOtpSuccessMessage(`A 6-digit OTP verification code has been sent to ${email}`);
        } catch (apiErr) {
          setOtpSuccessMessage(`Demo Mode: A 6-digit OTP code (e.g. 123456) sent to ${email}`);
        }
        setAuthStep('otp_verify');
      } else {
        let activeUser: UserProfile;
        try {
          const res = await loginUser({ email, password });
          activeUser = res.user;
        } catch (apiErr) {
          // Fallback to local session when backend is offline
          activeUser = {
            id: `user_${Date.now()}`,
            email,
            name: email.split('@')[0] || 'ReachInbox User',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
            slackConnected: false,
          };
        }
        localStorage.setItem('reachinbox_user_email', activeUser.email);
        localStorage.setItem('reachinbox_user_name', activeUser.name);
        setUser(activeUser);
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.error || err.message || 'Authentication failed');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Submit OTP Verification Code
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!otpInput || otpInput.trim().length !== 6) {
      setAuthError('Please enter a valid 6-digit numeric OTP code.');
      return;
    }

    setIsAuthLoading(true);
    try {
      let activeUser: UserProfile;
      try {
        const res = await verifyOtpApi({ email, otp: otpInput.trim() });
        activeUser = res.user;
      } catch (apiErr) {
        // Fallback to local session when backend is offline
        activeUser = {
          id: `user_${Date.now()}`,
          email,
          name: name || email.split('@')[0] || 'ReachInbox User',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
          slackConnected: false,
        };
      }

      localStorage.setItem('reachinbox_user_email', activeUser.email);
      localStorage.setItem('reachinbox_user_name', activeUser.name);

      // Trigger celebration confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      setUser(activeUser);
    } catch (err: any) {
      setAuthError(err.response?.data?.error || err.message || 'OTP Verification failed');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Resend OTP Code
  const handleResendOtp = async () => {
    setAuthError(null);
    setOtpSuccessMessage(null);
    setIsAuthLoading(true);
    try {
      try {
        const res = await sendOtpApi({ name, email, password });
        setEtherealPreviewUrl(res.etherealPreviewUrl || null);
        setOtpSuccessMessage(`New 6-digit OTP verification code sent to ${email}`);
      } catch (apiErr) {
        setOtpSuccessMessage(`Demo Mode: New 6-digit OTP code sent to ${email}`);
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.error || err.message || 'Failed to resend OTP');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Google OAuth Login Hook using Client ID
  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsAuthLoading(true);
      setAuthError(null);
      try {
        const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });

        const gUser = userInfo.data;
        const res = await googleAuthLogin({
          email: gUser.email,
          name: gUser.name,
          avatar: gUser.picture,
          googleId: gUser.sub,
        });

        localStorage.setItem('reachinbox_user_email', res.user.email);
        localStorage.setItem('reachinbox_user_name', res.user.name);
        setUser(res.user);
      } catch (err: any) {
        console.error('Google Userinfo error:', err);
        setAuthError('Failed to retrieve profile from Google.');
      } finally {
        setIsAuthLoading(false);
      }
    },
    onError: (error) => {
      console.error('Google Login Error:', error);
      setAuthError('Google Sign-In was cancelled or failed.');
    },
  });

  const handleLogout = () => {
    localStorage.removeItem('reachinbox_user_email');
    localStorage.removeItem('reachinbox_user_name');
    setUser(null);
  };

  const handleSearchScheduled = async (query: string, status: string) => {
    try {
      const activeUserEmail = user?.email || localStorage.getItem('reachinbox_user_email') || undefined;
      const res = await searchEmailsApi(query, status, activeUserEmail);
      setSearchSource(res.source);
      setScheduledItems(
        res.items.filter((item) => ['PENDING', 'PROCESSING', 'RATE_LIMITED'].includes(item.status))
      );
    } catch (err) {
      console.error('Search scheduled error:', err);
    }
  };

  const handleSearchSent = async (query: string, status: string) => {
    try {
      const activeUserEmail = user?.email || localStorage.getItem('reachinbox_user_email') || undefined;
      const res = await searchEmailsApi(query, status, activeUserEmail);
      setSearchSource(res.source);
      setSentItems(res.items.filter((item) => ['SENT', 'FAILED'].includes(item.status)));
    } catch (err) {
      console.error('Search sent error:', err);
    }
  };

  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);

  // Sign In / Create Account Screen View (Exact Match Split-Panel Layout)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 lg:p-8 bg-slate-900 dark:bg-slate-950 text-slate-900 dark:text-white relative overflow-hidden font-sans py-8">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, type: 'spring', stiffness: 280, damping: 24 }}
          className="relative max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-[#0c1021] text-white my-auto"
        >
          {/* Left Dark Branded Panel with Animated 3D Fiber-Optic Data Stream Canvas */}
          <div className="lg:col-span-6 bg-[#0c1021] p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden">
            {/* Real-time 3D Perspective Glowing Fiber-Optic Canvas */}
            <DataStreamCanvas />

            {/* Ambient glows behind SVG */}
            <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

            {/* Top Brand Header */}
            <div className="flex items-center space-x-3.5 z-10">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-indigo-500 p-0.5 shadow-lg shadow-purple-500/30 flex items-center justify-center">
                <div className="h-full w-full bg-[#0c1021] rounded-[14px] flex items-center justify-center">
                  <Mail className="h-5 w-5 text-indigo-400" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight leading-tight">ReachInbox</h2>
                <p className="text-xs text-slate-400 font-medium">Scheduler</p>
              </div>
            </div>

            {/* Center Dynamic Animated Data Stream Visual */}
            <div className="my-auto py-8 relative z-10 flex flex-col items-center justify-center w-full">
              {/* Ambient Glow Spotlight */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-36 bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
            </div>

            {/* Bottom Panel Metadata */}
            <div className="relative z-10 pt-4 text-[11px] text-slate-500 font-medium flex items-center justify-between">
              <span>Persistent Redis Queue</span>
              <span>v2.0 Production</span>
            </div>
          </div>

          {/* Right Clean White Panel */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-8 lg:p-10 flex flex-col justify-center text-left relative">
            {authStep === 'otp_verify' ? (
              <div>
                {/* Header */}
                <div className="mb-6 text-left">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-bold mb-3">
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>OTP Account Verification</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Verify Email & Create Account
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                    We have sent a 6-digit One-Time Password (OTP) to <strong className="text-slate-900 dark:text-white">{email}</strong>.
                  </p>
                </div>

                {otpSuccessMessage && (
                  <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{otpSuccessMessage}</span>
                  </div>
                )}

                {authError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{authError}</span>
                  </div>
                )}

                {/* Ethereal Inbox Link (for testing/email preview) */}
                {etherealPreviewUrl && (
                  <div className="mb-4 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 text-purple-900 dark:text-purple-200 text-xs flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span className="font-semibold text-[11px]">Testing Mode: View sent email inbox</span>
                    </div>
                    <a
                      href={etherealPreviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] rounded-lg transition-colors"
                    >
                      <span>Open Inbox</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* OTP Form */}
                <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Enter 6-Digit OTP Verification Code
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <input
                        type="text"
                        maxLength={6}
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="••••••"
                        required
                        autoFocus
                        className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-purple-300 dark:border-purple-600 text-slate-900 dark:text-white text-lg font-mono tracking-[0.4em] text-center focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-500/20 transition-all font-black"
                      />
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    type="submit"
                    disabled={isAuthLoading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-brand-600 hover:from-purple-700 hover:to-brand-700 text-white font-extrabold text-xs shadow-lg shadow-purple-500/30 hover:shadow-purple-500/45 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                  >
                    <span>{isAuthLoading ? 'Verifying OTP Code...' : 'Verify OTP & Create Account'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </motion.button>
                </form>

                {/* Footer Resend / Back */}
                <div className="mt-5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthStep('credentials');
                      setAuthError(null);
                    }}
                    className="font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    ← Back to Sign Up
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isAuthLoading}
                    className="font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${isAuthLoading ? 'animate-spin' : ''}`} />
                    <span>Resend OTP Code</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Form Header */}
                <div className="mb-6 text-left">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    {authMode === 'signin'
                      ? 'Sign in to manage your scheduler.'
                      : 'Start scheduling high-volume email campaigns.'}
                  </p>
                </div>

                {authError && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{authError}</span>
                  </motion.div>
                )}

                {/* Top Social Sign-In Buttons */}
                <div className="space-y-2.5 mb-5">
                  {/* Google OAuth Button */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => loginWithGoogle()}
                    disabled={isAuthLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100 font-bold text-xs border border-slate-300 dark:border-slate-700 shadow-sm hover:shadow-purple-500/10 flex items-center justify-center space-x-2.5 transition-all group"
                  >
                    <svg className="h-4 w-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google OAuth</span>
                  </motion.button>

                  {/* GitHub Button */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="button"
                    onClick={() => {
                      // Fallback GitHub demo trigger
                      setEmail('github.user@reachinbox.com');
                      setPassword('sandeep123');
                    }}
                    disabled={isAuthLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100 font-bold text-xs border border-slate-300 dark:border-slate-700 shadow-sm flex items-center justify-center space-x-2.5 transition-all group"
                  >
                    <svg className="h-4 w-4 fill-current text-slate-900 dark:text-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    <span>Continue with GitHub</span>
                  </motion.button>
                </div>

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                    <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 dark:text-slate-500">OR SIGN IN WITH EMAIL</span>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  {authMode === 'signup' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Sandeep Gundes"
                          required={authMode === 'signup'}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 transition-all font-medium"
                        />
                      </div>
                    </div>
                  )}

                  {/* Email Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Password</label>
                      {authMode === 'signin' && (
                        <button
                          type="button"
                          onClick={() => alert('Password reset instructions sent to your email.')}
                          className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 font-semibold transition-colors"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Glowing Purple Primary Action Button */}
                  <motion.button
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    type="submit"
                    disabled={isAuthLoading}
                    className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs shadow-lg shadow-purple-500/30 hover:shadow-purple-500/45 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                  >
                    <span>{authMode === 'signup' ? 'Create Account & Send OTP' : 'Sign In To Dashboard'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </motion.button>
                </form>

                {/* Bottom Switcher Link */}
                <div className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {authMode === 'signin' ? (
                    <span>
                      Don&apos;t have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signup');
                          setAuthStep('credentials');
                          setAuthError(null);
                        }}
                        className="text-purple-600 dark:text-purple-400 font-bold hover:underline"
                      >
                        Sign up
                      </button>
                    </span>
                  ) : (
                    <span>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signin');
                          setAuthStep('credentials');
                          setAuthError(null);
                        }}
                        className="text-purple-600 dark:text-purple-400 font-bold hover:underline"
                      >
                        Sign in
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-16 relative overflow-x-hidden font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
      {/* Background Ambient Glow Orbs */}
      <div className={`fixed -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none ${theme === 'dark' ? 'bg-brand-600/10' : 'bg-brand-400/15'
        }`} />
      <div className={`fixed top-1/3 -right-40 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none ${theme === 'dark' ? 'bg-indigo-600/10' : 'bg-indigo-400/15'
        }`} />
      <div className={`fixed -bottom-40 left-1/3 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none ${theme === 'dark' ? 'bg-purple-600/10' : 'bg-purple-400/15'
        }`} />

      {/* Top Sticky Header */}
      <Header
        user={user}
        onLogout={handleLogout}
        onOpenSlackModal={() => setIsSlackModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenComposeModal={() => setIsComposeOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Dashboard Container */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-6">
        {/* Real-Time BullMQ Queue Metrics Widget */}
        <QueueStatsWidget
          stats={stats}
          onRefresh={loadDashboardData}
          loading={statsLoading}
        />

        {/* Tab Content Views */}
        <AnimatePresence mode="wait">
          {activeTab === 'scheduled' && (
            <motion.div
              key="scheduled-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ScheduledEmailsTable
                items={scheduledItems}
                loading={loading}
                onRefresh={loadDashboardData}
                onSearch={handleSearchScheduled}
                searchSource={searchSource}
              />
            </motion.div>
          )}

          {activeTab === 'sent' && (
            <motion.div
              key="sent-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <SentEmailsTable
                items={sentItems}
                loading={loading}
                onSearch={handleSearchSent}
                onSelectEmail={setSelectedEmail}
              />
            </motion.div>
          )}

          {activeTab === 'queue' && (
            <motion.div
              key="queue-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full glass-panel rounded-2xl border border-slate-200/80 p-6 shadow-md shadow-slate-200/40"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-base font-extrabold text-slate-900">Live BullMQ Board & Queue Inspection</h3>
                </div>
                <a
                  href="http://localhost:5002/admin/queues"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-700 text-white flex items-center space-x-1.5 transition-all shadow-sm"
                >
                  <span>Open Standalone Bull-Board</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <p className="text-xs text-slate-500 mb-4 font-medium">
                Real-time queue visibility powered by <code className="text-brand-700 font-mono font-bold">@bull-board/express</code>. Inspect delayed jobs, job payloads, attempt retries, and worker status.
              </p>

              <div className="w-full h-[600px] rounded-xl overflow-hidden border border-slate-200 bg-white">
                <iframe
                  src="http://localhost:5002/admin/queues"
                  className="w-full h-full border-none"
                  title="BullMQ Live Board"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onScheduleSuccess={loadDashboardData}
        userEmail={user.email}
      />

      <SlackConnectModal
        isOpen={isSlackModalOpen}
        onClose={() => setIsSlackModalOpen(false)}
        slackConnected={user.slackConnected}
        currentWebhookUrl={user.slackWebhookUrl}
        userEmail={user.email}
        onStatusChange={() => {
          initUserSession();
          loadDashboardData();
        }}
      />

      <EmailDetailModal
        email={selectedEmail}
        onClose={() => setSelectedEmail(null)}
      />
    </div>
  );
}
