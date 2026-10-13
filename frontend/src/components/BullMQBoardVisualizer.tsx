'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Play,
  Pause,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Cpu,
  ExternalLink,
  Code2,
  ShieldAlert,
  Kanban,
  Sparkles,
  Send,
  Zap,
  Info,
  Server,
  Layers,
} from 'lucide-react';
import {
  ADMIN_BOARD_URL,
  fetchScheduledEmails,
  fetchSentEmails,
  isStaticMode,
  getMockScheduledStore,
  saveMockScheduledStore,
  processMockEmails,
} from '../lib/api';

export interface BullJobMock {
  id: string;
  name: string;
  recipient: string;
  subject: string;
  sender: string;
  status: 'active' | 'waiting' | 'delayed' | 'completed' | 'failed';
  delayMs: number;
  scheduledFor?: string;
  attempts: number;
  timestamp: string;
  etherealPreviewUrl?: string | null;
}

export const BullMQBoardVisualizer: React.FC = () => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'external'>('kanban');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'waiting' | 'delayed' | 'completed' | 'failed'>('all');
  const [inspectJob, setInspectJob] = useState<BullJobMock | null>(null);
  const [isQueuePaused, setIsQueuePaused] = useState(false);
  const [isBackendLive, setIsBackendLive] = useState<boolean | null>(null);
  const [jobs, setJobs] = useState<BullJobMock[]>([]);
  const [isEnqueueing, setIsEnqueueing] = useState(false);

  // Check if mixed-content iframe loading is blocked (HTTPS site trying to embed HTTP localhost)
  const isMixedContentBlocked =
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    ADMIN_BOARD_URL.startsWith('http:');

  const checkBackendStatus = useCallback(async () => {
    if (typeof window === 'undefined') return;
    // Don't attempt to fetch insecure HTTP from HTTPS to avoid mixed-content console errors
    if (window.location.protocol === 'https:' && ADMIN_BOARD_URL.startsWith('http:')) {
      setIsBackendLive(false);
      return;
    }

    try {
      const healthUrl = ADMIN_BOARD_URL.replace(/\/admin\/queues\/?$/, '') + '/health';
      const res = await fetch(healthUrl, { method: 'GET', mode: 'cors' });
      setIsBackendLive(res.ok);
    } catch {
      setIsBackendLive(false);
    }
  }, []);

  const syncJobs = useCallback(async () => {
    try {
      const activeUserEmail =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem('reachinbox_user_email') || undefined
          : undefined;

      const [schedRes, sentRes] = await Promise.all([
        fetchScheduledEmails(activeUserEmail),
        fetchSentEmails(activeUserEmail),
      ]);

      const mappedJobs: BullJobMock[] = [];

      schedRes.items.forEach((item) => {
        let status: 'active' | 'waiting' | 'delayed' | 'completed' | 'failed' = 'delayed';
        if (item.status === 'PROCESSING') status = 'active';
        else if (item.status === 'PENDING') status = 'delayed';
        else if (item.status === 'RATE_LIMITED') status = 'waiting';

        mappedJobs.push({
          id: item.bullJobId || item.id,
          name: 'send-email',
          recipient: item.recipientEmail,
          subject: item.subject,
          sender: item.senderEmail,
          status,
          delayMs: item.delayMs || 2000,
          scheduledFor: item.scheduledFor,
          attempts: 1,
          timestamp: item.createdAt,
          etherealPreviewUrl: item.etherealPreviewUrl,
        });
      });

      sentRes.items.forEach((item) => {
        mappedJobs.push({
          id: item.bullJobId || item.id,
          name: 'send-email',
          recipient: item.recipientEmail,
          subject: item.subject,
          sender: item.senderEmail,
          status: item.status === 'SENT' ? 'completed' : 'failed',
          delayMs: item.delayMs || 2000,
          attempts: item.status === 'SENT' ? 1 : 3,
          timestamp: item.sentAt || item.createdAt,
          etherealPreviewUrl: item.etherealPreviewUrl,
        });
      });

      setJobs(mappedJobs);
    } catch (e) {
      console.error('Failed to sync BullMQ jobs:', e);
    }
  }, []);

  useEffect(() => {
    checkBackendStatus();
    syncJobs();
    const interval = setInterval(() => {
      syncJobs();
    }, 3000);
    return () => clearInterval(interval);
  }, [checkBackendStatus, syncJobs]);

  const handleRetryJob = (id: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: 'waiting', attempts: j.attempts + 1 } : j))
    );
  };

  const handleDeleteJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  // Quick Action: Enqueue a test BullMQ email job
  const handleEnqueueTestJob = () => {
    setIsEnqueueing(true);
    const targetEmail =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('reachinbox_user_email') || 'reachinbox.lead@example.com'
        : 'reachinbox.lead@example.com';

    const testId = `job_${Date.now()}`;
    const delayMs = 6000;
    const targetScheduledFor = new Date(Date.now() + delayMs).toISOString();

    if (isStaticMode()) {
      const scheduled = getMockScheduledStore();
      scheduled.unshift({
        id: testId,
        senderEmail: targetEmail,
        recipientEmail: `lead.${Math.floor(Math.random() * 900 + 100)}@techcorp.io`,
        subject: `BullMQ Test Dispatch #${Math.floor(Math.random() * 1000)}`,
        body: 'Automated high-concurrency email test verified through BullMQ & Redis.',
        scheduledFor: targetScheduledFor,
        delayMs,
        hourlyLimit: 200,
        status: 'PENDING',
        idempotencyKey: `idemp_${testId}`,
        bullJobId: testId,
        createdAt: new Date().toISOString(),
      });
      saveMockScheduledStore(scheduled);
    }

    syncJobs();
    setTimeout(() => {
      setIsEnqueueing(false);
    }, 600);
  };

  // Quick Action: Process delayed jobs immediately
  const handleProcessDelayedNow = () => {
    if (isStaticMode()) {
      processMockEmails();
    }
    syncJobs();
  };

  const uniqueJobs = Array.from(new Map(jobs.map((j) => [j.id, j])).values());
  const filteredJobs = uniqueJobs.filter(
    (j) => filterStatus === 'all' || j.status === filterStatus
  );

  const delayedJobs = uniqueJobs.filter((j) => j.status === 'delayed');
  const activeJobs = uniqueJobs.filter((j) => j.status === 'active');
  const waitingJobs = uniqueJobs.filter((j) => j.status === 'waiting');
  const completedJobs = uniqueJobs.filter((j) => j.status === 'completed');
  const failedJobs = uniqueJobs.filter((j) => j.status === 'failed');

  return (
    <div className="w-full space-y-6">
      {/* Top Controls Bar */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-indigo-500 p-0.5 shadow-lg shadow-purple-500/20 flex items-center justify-center">
            <div className="h-full w-full bg-white dark:bg-slate-900 rounded-[14px] flex items-center justify-center">
              <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                BullMQ Live Queue Inspection
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isQueuePaused
                    ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                }`}
              >
                {isQueuePaused ? 'Paused' : 'Active Queue'}
              </span>
              {isStaticMode() && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  Client Simulator Engine
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Queue:{' '}
              <code className="font-mono text-purple-600 dark:text-purple-400 font-bold">
                email-sending-queue
              </code>{' '}
              | Concurrency:{' '}
              <code className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                5 Workers
              </code>{' '}
              | Redis:{' '}
              <code className="font-mono text-emerald-600 font-bold">
                {isStaticMode() ? 'In-Memory BullMQ Buffer' : '127.0.0.1:6379'}
              </code>
            </p>
          </div>
        </div>

        {/* Action & View Mode Buttons */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* View Mode Toggle Segmented Control */}
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center space-x-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                viewMode === 'kanban'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Interactive Board</span>
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                viewMode === 'table'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>Table View</span>
            </button>

            <button
              onClick={() => setViewMode('external')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                viewMode === 'external'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Server className="h-3.5 w-3.5" />
              <span>Bull-Board UI</span>
            </button>
          </div>

          {/* Quick Enqueue Test Job */}
          <button
            onClick={handleEnqueueTestJob}
            disabled={isEnqueueing}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-purple-500/20"
            title="Enqueue a simulated test email with 6s delay"
          >
            <Zap className={`h-3.5 w-3.5 ${isEnqueueing ? 'animate-bounce' : ''}`} />
            <span>+ Enqueue Test Job</span>
          </button>

          {/* Pause / Resume */}
          <button
            onClick={() => setIsQueuePaused(!isQueuePaused)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center space-x-1.5 transition-all"
          >
            {isQueuePaused ? (
              <Play className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Pause className="h-3.5 w-3.5 text-amber-500" />
            )}
            <span>{isQueuePaused ? 'Resume' : 'Pause'}</span>
          </button>

          {/* Direct Pop Out */}
          <a
            href={ADMIN_BOARD_URL}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center space-x-1.5 transition-all"
            title="Open backend Bull-Board in new tab"
          >
            <span>Pop Out</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'kanban' && (
        /* Native Interactive BullMQ Kanban Board View */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Column 1: Delayed / Scheduled */}
            <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Delayed
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  {delayedJobs.length}
                </span>
              </div>

              <div className="mt-3 space-y-3 flex-1 overflow-y-auto max-h-[520px] pr-1">
                {delayedJobs.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    <Clock className="h-6 w-6 mx-auto mb-2 opacity-40 text-amber-500" />
                    <span>No delayed jobs</span>
                    <button
                      onClick={handleEnqueueTestJob}
                      className="block mx-auto mt-2 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      + Add Test Job
                    </button>
                  </div>
                ) : (
                  delayedJobs.map((job) => (
                    <motion.div
                      key={job.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-200/60 dark:border-amber-500/20 shadow-sm space-y-2 hover:border-amber-400 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-extrabold text-amber-600 dark:text-amber-400 truncate max-w-[120px]">
                          {job.id}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600">
                          {Math.round(job.delayMs / 1000)}s delay
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {job.recipient}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {job.subject}
                      </div>
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                        <button
                          onClick={() => setInspectJob(job)}
                          className="font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center space-x-1"
                        >
                          <Code2 className="h-3 w-3" />
                          <span>Payload</span>
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          className="text-rose-500 hover:text-rose-700"
                          title="Remove job"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Column 2: Active / Processing */}
            <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Active
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  {activeJobs.length}
                </span>
              </div>

              <div className="mt-3 space-y-3 flex-1 overflow-y-auto max-h-[520px] pr-1">
                {activeJobs.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    <Activity className="h-6 w-6 mx-auto mb-2 opacity-40 text-blue-500" />
                    <span>No jobs processing</span>
                  </div>
                ) : (
                  activeJobs.map((job) => (
                    <motion.div
                      key={job.id}
                      layout
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-500/40 shadow-sm space-y-2 relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse" />
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-extrabold text-blue-600 truncate max-w-[120px]">
                          {job.id}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600">
                          Worker #1
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {job.recipient}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {job.subject}
                      </div>
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                        <button
                          onClick={() => setInspectJob(job)}
                          className="font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center space-x-1"
                        >
                          <Code2 className="h-3 w-3" />
                          <span>Payload</span>
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Waiting / Rate Limited */}
            <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Waiting
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-purple-500/10 text-purple-600 border border-purple-500/20">
                  {waitingJobs.length}
                </span>
              </div>

              <div className="mt-3 space-y-3 flex-1 overflow-y-auto max-h-[520px] pr-1">
                {waitingJobs.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    <Layers className="h-6 w-6 mx-auto mb-2 opacity-40 text-purple-500" />
                    <span>Queue buffer empty</span>
                  </div>
                ) : (
                  waitingJobs.map((job) => (
                    <motion.div
                      key={job.id}
                      layout
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-200/60 dark:border-purple-500/20 shadow-sm space-y-2"
                    >
                      <div className="font-mono text-[11px] font-extrabold text-purple-600 truncate">
                        {job.id}
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {job.recipient}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {job.subject}
                      </div>
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                        <button
                          onClick={() => setInspectJob(job)}
                          className="font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center space-x-1"
                        >
                          <Code2 className="h-3 w-3" />
                          <span>Payload</span>
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Column 4: Completed / Sent */}
            <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Completed
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  {completedJobs.length}
                </span>
              </div>

              <div className="mt-3 space-y-3 flex-1 overflow-y-auto max-h-[520px] pr-1">
                {completedJobs.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="h-6 w-6 mx-auto mb-2 opacity-40 text-emerald-500" />
                    <span>No completed jobs</span>
                  </div>
                ) : (
                  completedJobs.map((job) => (
                    <motion.div
                      key={job.id}
                      layout
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200/60 dark:border-emerald-500/20 shadow-sm space-y-2 hover:border-emerald-400 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-extrabold text-emerald-600 truncate max-w-[120px]">
                          {job.id}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 flex items-center space-x-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Delivered</span>
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {job.recipient}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {job.subject}
                      </div>
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                        <button
                          onClick={() => setInspectJob(job)}
                          className="font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center space-x-1"
                        >
                          <Code2 className="h-3 w-3" />
                          <span>Payload</span>
                        </button>
                        {job.etherealPreviewUrl && (
                          <a
                            href={job.etherealPreviewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
                          >
                            <span>Ethereal</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Column 5: Failed */}
            <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Failed
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                  {failedJobs.length}
                </span>
              </div>

              <div className="mt-3 space-y-3 flex-1 overflow-y-auto max-h-[520px] pr-1">
                {failedJobs.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="h-6 w-6 mx-auto mb-2 opacity-40 text-slate-300 dark:text-slate-700" />
                    <span>0 delivery errors</span>
                  </div>
                ) : (
                  failedJobs.map((job) => (
                    <motion.div
                      key={job.id}
                      layout
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-rose-200/60 dark:border-rose-500/20 shadow-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-extrabold text-rose-600 truncate max-w-[120px]">
                          {job.id}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600">
                          Max Retries Exceeded
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {job.recipient}
                      </div>
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                        <button
                          onClick={() => handleRetryJob(job.id)}
                          className="font-bold text-emerald-600 hover:underline flex items-center space-x-1"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Retry</span>
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Worker Pool Status Box */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  BullMQ Worker Threads Concurrency Pool (WORKER_CONCURRENCY = 5)
                </h4>
              </div>
              {delayedJobs.length > 0 && (
                <button
                  onClick={handleProcessDelayedNow}
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center space-x-1"
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>Process Delayed Jobs Now</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((idx) => {
                const activeJob = activeJobs[idx - 1];
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs transition-all ${
                      activeJob
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 shadow-sm'
                        : 'bg-slate-100/70 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono font-bold">
                      <span>Thread #{idx}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          activeJob ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                    </div>
                    <div className="text-[11px] mt-1 font-semibold truncate">
                      {activeJob ? `Sending: ${activeJob.recipient.split('@')[0]}` : 'Idle (Waiting)'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Table Inspection View */}
      {viewMode === 'table' && (
        <div className="space-y-6">
          {/* Filter Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            {(['all', 'active', 'waiting', 'delayed', 'completed', 'failed'] as const).map(
              (st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    filterStatus === st
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {st} ({st === 'all' ? uniqueJobs.length : uniqueJobs.filter((j) => j.status === st).length})
                </button>
              )
            )}
          </div>

          {/* Jobs Table */}
          <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-3 px-4">Job ID</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Attempts</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No jobs match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((job) => (
                      <tr
                        key={job.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-purple-600 dark:text-purple-400">
                          {job.id}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                          {job.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-900 dark:text-white font-bold">
                          {job.recipient}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 truncate max-w-xs">
                          {job.subject}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase ${
                              job.status === 'active'
                                ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                : job.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                : job.status === 'delayed'
                                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                : job.status === 'failed'
                                ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                : 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                            }`}
                          >
                            <span>{job.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">{job.attempts}/3</td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => setInspectJob(job)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                            title="Inspect Payload"
                          >
                            <Code2 className="h-3.5 w-3.5" />
                          </button>
                          {job.status === 'failed' && (
                            <button
                              onClick={() => handleRetryJob(job.id)}
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                              title="Retry Job"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteJob(job.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-colors"
                            title="Remove Job"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* External / Embedded Bull-Board UI */}
      {viewMode === 'external' && (
        <div className="relative w-full rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl bg-[#14161f]">
          <div className="px-4 py-2.5 bg-slate-900 text-slate-300 text-xs font-mono flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-extrabold text-white">Live Bull Dashboard (@bull-board/express)</span>
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">{ADMIN_BOARD_URL}</span>
            </div>

            <div className="flex items-center space-x-2">
              <a
                href={ADMIN_BOARD_URL}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] flex items-center space-x-1 transition-colors"
              >
                <span>Open Direct</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Mixed Content Protection Handler for HTTPS GitHub Pages */}
          {isMixedContentBlocked ? (
            <div className="p-8 sm:p-12 text-center text-white max-w-2xl mx-auto space-y-5">
              <div className="h-16 w-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <ShieldAlert className="h-8 w-8 text-amber-400" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-black text-white">
                  HTTPS Security Protected (Mixed-Content Policy)
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Because this site is hosted securely over <code className="text-purple-400">HTTPS (GitHub Pages)</code>, modern web browsers block embedding unencrypted <code className="text-amber-400">http://localhost:5000</code> inside an iframe.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left space-y-2 text-xs">
                <div className="font-bold text-slate-200 flex items-center space-x-2">
                  <Server className="h-4 w-4 text-emerald-400" />
                  <span>How to view the raw @bull-board express UI:</span>
                </div>
                <p className="text-slate-400">
                  1. Run your backend locally: <code className="text-emerald-400 font-mono">cd backend && npm run dev</code>
                </p>
                <p className="text-slate-400">
                  2. Open the dashboard directly in your browser:
                </p>
              </div>

              <div className="flex items-center justify-center space-x-3 pt-2">
                <a
                  href={ADMIN_BOARD_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs flex items-center space-x-2 shadow-lg shadow-purple-500/20"
                >
                  <span>Open Bull-Board (http://localhost:5000/admin/queues)</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>

                <button
                  onClick={() => setViewMode('kanban')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
                >
                  Back to Interactive Board
                </button>
              </div>
            </div>
          ) : (
            <iframe
              id="bullmq-board-iframe"
              src={ADMIN_BOARD_URL}
              className="w-full h-[680px] border-0 bg-[#14161f]"
              title="Bull Dashboard Admin UI"
            />
          )}
        </div>
      )}

      {/* Inspect Job Payload Modal */}
      <AnimatePresence>
        {inspectJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                    Job Payload: {inspectJob.id}
                  </h3>
                </div>
                <button
                  onClick={() => setInspectJob(null)}
                  className="px-2 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              </div>
              <pre className="mt-4 p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[380px]">
                {JSON.stringify(
                  {
                    jobId: inspectJob.id,
                    queueName: 'email-sending-queue',
                    name: inspectJob.name,
                    data: {
                      senderEmail: inspectJob.sender,
                      recipientEmail: inspectJob.recipient,
                      subject: inspectJob.subject,
                      delayMs: inspectJob.delayMs,
                      hourlyLimit: 200,
                      idempotencyKey: `sent_idempotency:${inspectJob.id}`,
                    },
                    opts: {
                      attempts: inspectJob.attempts,
                      delay: inspectJob.delayMs,
                      scheduledFor: inspectJob.scheduledFor,
                    },
                    status: inspectJob.status,
                    timestamp: inspectJob.timestamp,
                    etherealPreviewUrl: inspectJob.etherealPreviewUrl || null,
                  },
                  null,
                  2
                )}
              </pre>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setInspectJob(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
