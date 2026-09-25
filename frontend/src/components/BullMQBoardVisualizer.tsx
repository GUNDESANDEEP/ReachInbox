'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Play, Pause, RefreshCw, Trash2, CheckCircle2, AlertTriangle, Clock, Cpu, ExternalLink, Code2, ShieldAlert } from 'lucide-react';

interface BullJobMock {
  id: string;
  name: string;
  recipient: string;
  subject: string;
  sender: string;
  status: 'active' | 'waiting' | 'delayed' | 'completed' | 'failed';
  delayMs: number;
  attempts: number;
  timestamp: string;
}

export const BullMQBoardVisualizer: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'waiting' | 'delayed' | 'completed' | 'failed'>('all');
  const [inspectJob, setInspectJob] = useState<BullJobMock | null>(null);
  const [isQueuePaused, setIsQueuePaused] = useState(false);

  const [jobs, setJobs] = useState<BullJobMock[]>([
    {
      id: 'job-9041',
      name: 'send-email',
      recipient: 'alex.dev@techcorp.io',
      subject: 'ReachInbox Product Demo & Architecture Deep Dive',
      sender: 'gundesandeep2005@gmail.com',
      status: 'active',
      delayMs: 2000,
      attempts: 1,
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: 'job-9042',
      name: 'send-email',
      recipient: 'mitrajit@github.com',
      subject: 'BullMQ Worker Rate Limiting Update',
      sender: 'gundesandeep2005@gmail.com',
      status: 'delayed',
      delayMs: 2700000,
      attempts: 1,
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: 'job-9043',
      name: 'send-email',
      recipient: 'yadav036@github.com',
      subject: 'Ethereal SMTP Transporter Configuration',
      sender: 'gundesandeep2005@gmail.com',
      status: 'waiting',
      delayMs: 2000,
      attempts: 1,
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: 'job-9039',
      name: 'send-email',
      recipient: 'sarah.founder@startup.co',
      subject: 'Campaign Launch Confirmation - ReachInbox Queue',
      sender: 'gundesandeep2005@gmail.com',
      status: 'completed',
      delayMs: 2000,
      attempts: 1,
      timestamp: new Date(Date.now() - 3600000).toLocaleTimeString(),
    },
    {
      id: 'job-9038',
      name: 'send-email',
      recipient: 'invalid.test@domain.invalid',
      subject: 'Failed Delivery Retry Log',
      sender: 'gundesandeep2005@gmail.com',
      status: 'failed',
      delayMs: 2000,
      attempts: 3,
      timestamp: new Date(Date.now() - 7200000).toLocaleTimeString(),
    },
  ]);

  const handleRetryJob = (id: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: 'waiting', attempts: j.attempts + 1 } : j))
    );
  };

  const handleDeleteJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const filteredJobs = jobs.filter((j) => filterStatus === 'all' || j.status === filterStatus);

  return (
    <div className="w-full space-y-6">
      {/* Top Controls Bar */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">BullMQ Live Queue Inspection</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isQueuePaused ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
              }`}>
                {isQueuePaused ? 'Paused' : 'Active Queue'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Queue: <code className="font-mono text-purple-600 dark:text-purple-400 font-bold">email-sending-queue</code> | Redis Connection: <code className="font-mono text-emerald-600 font-bold">127.0.0.1:6379</code>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsQueuePaused(!isQueuePaused)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center space-x-1.5 transition-all"
          >
            {isQueuePaused ? <Play className="h-3.5 w-3.5 text-emerald-500" /> : <Pause className="h-3.5 w-3.5 text-amber-500" />}
            <span>{isQueuePaused ? 'Resume Queue' : 'Pause Queue'}</span>
          </button>

          <a
            href="http://localhost:5000/admin/queues"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-purple-500/20"
          >
            <span>Open Standalone Admin UI</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {(['all', 'active', 'waiting', 'delayed', 'completed', 'failed'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              filterStatus === st
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {st} ({st === 'all' ? jobs.length : jobs.filter((j) => j.status === st).length})
          </button>
        ))}
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
              {filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-purple-600 dark:text-purple-400">{job.id}</td>
                  <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">{job.name}</td>
                  <td className="py-3 px-4 font-mono text-slate-900 dark:text-white font-bold">{job.recipient}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300 truncate max-w-xs">{job.subject}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase ${
                      job.status === 'active'
                        ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                        : job.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : job.status === 'delayed'
                        ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                        : job.status === 'failed'
                        ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                        : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                    }`}>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Worker Pool Status Box */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center space-x-2">
          <Cpu className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Worker Threads Concurrency Pool (WORKER_CONCURRENCY = 5)
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs">
            <div className="font-mono font-bold text-blue-600">Thread #1</div>
            <div className="text-[11px] text-slate-500 mt-1 font-semibold">Active: alex.dev</div>
          </div>
          {[2, 3, 4, 5].map((idx) => (
            <div key={idx} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="font-mono font-bold text-slate-500">Thread #{idx}</div>
              <div className="text-[11px] text-slate-400 mt-1 font-semibold">Idle</div>
            </div>
          ))}
        </div>
      </div>

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
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                  Inspect Payload - {inspectJob.id}
                </h3>
                <button
                  onClick={() => setInspectJob(null)}
                  className="px-2 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              </div>
              <pre className="mt-4 p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto">
                {JSON.stringify(
                  {
                    jobId: inspectJob.id,
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
                    },
                    timestamp: inspectJob.timestamp,
                  },
                  null,
                  2
                )}
              </pre>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
