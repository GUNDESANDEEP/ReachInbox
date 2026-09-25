'use client';

import React from 'react';
import { QueueStats } from '../lib/api';
import { Activity, Clock, CheckCircle, AlertTriangle, Layers, Cpu, ShieldAlert, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface QueueStatsWidgetProps {
  stats: QueueStats | null;
  onRefresh: () => void;
  loading: boolean;
}

export const QueueStatsWidget: React.FC<QueueStatsWidgetProps> = ({ stats, onRefresh, loading }) => {
  if (!stats) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full glass-panel rounded-2xl p-5 mb-6 relative overflow-hidden backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-lg shadow-slate-200/40 dark:shadow-2xl"
    >
      {/* Background glow spots */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-brand-400/10 dark:bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-400/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200/80 dark:border-white/10 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300 border border-brand-200 dark:border-brand-500/40 shadow-sm">
            <Activity className="h-5 w-5 animate-pulse text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              BullMQ Real-Time Queue & Worker Metrics
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 badge-green-glow">
                Persistent Redis Queue
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Live job state, rate limit counter & concurrency tracking</p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-100/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-slate-300 shadow-inner">
            <Cpu className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Concurrency: <strong className="text-slate-900 dark:text-white font-bold">{stats.worker.concurrency}</strong></span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span>Min Delay: <strong className="text-slate-900 dark:text-white font-bold">{stats.worker.minDelayMs / 1000}s</strong></span>
          </div>

          <motion.button
            whileHover={{ scale: 1.08, rotate: 180 }}
            whileTap={{ scale: 0.92 }}
            transition={{ duration: 0.3 }}
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-colors shadow-sm"
            title="Refresh Metrics"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-brand-600 dark:text-brand-400' : ''}`} />
          </motion.button>
        </div>
      </div>

      {/* Impressive Color Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 relative z-10">
        {/* Active Jobs */}
        <motion.div
          whileHover={{ y: -4, scale: 1.03 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className="glass-card-indigo p-4 rounded-xl border relative group cursor-pointer overflow-hidden shadow-lg"
        >
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-indigo-300">Active</span>
            <Activity className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-950 dark:text-white font-mono tracking-tight">{stats.bullMQ.active}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-300 font-semibold mt-1">Currently sending</div>
        </motion.div>

        {/* Waiting Jobs */}
        <motion.div
          whileHover={{ y: -4, scale: 1.03 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className="glass-card-sky p-4 rounded-xl border relative group cursor-pointer overflow-hidden shadow-lg"
        >
          <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 mb-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-sky-300">Waiting</span>
            <Layers className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-950 dark:text-white font-mono tracking-tight">{stats.bullMQ.waiting}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-300 font-semibold mt-1">In BullMQ queue</div>
        </motion.div>

        {/* Delayed Jobs */}
        <motion.div
          whileHover={{ y: -4, scale: 1.03 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className="glass-card-amber p-4 rounded-xl border relative group cursor-pointer overflow-hidden shadow-lg"
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-amber-300">Delayed</span>
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono tracking-tight">{stats.bullMQ.delayed}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-300 font-semibold mt-1">Scheduled / Throttled</div>
        </motion.div>

        {/* Sent / Completed Jobs */}
        <motion.div
          whileHover={{ y: -4, scale: 1.03 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className="glass-card-emerald p-4 rounded-xl border relative group cursor-pointer overflow-hidden shadow-lg"
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-emerald-300">Sent / Completed</span>
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono tracking-tight">{stats.dbCounts.sent}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-300 font-semibold mt-1">Live SMTP & Sandbox</div>
        </motion.div>

        {/* Failed Jobs */}
        <motion.div
          whileHover={{ y: -4, scale: 1.03 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className="glass-card-rose p-4 rounded-xl border relative group cursor-pointer overflow-hidden shadow-lg"
        >
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-rose-300">Failed</span>
            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-700 dark:text-rose-300 font-mono tracking-tight">
            {stats.dbCounts.failed || stats.bullMQ.failed}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-300 font-semibold mt-1">Delivery exceptions</div>
        </motion.div>

        {/* Rate Limit Hits */}
        <motion.div
          whileHover={{ y: -4, scale: 1.03 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className="glass-card-purple p-4 rounded-xl border relative group cursor-pointer overflow-hidden shadow-lg"
        >
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-purple-300">Rate Limit Hits</span>
            <ShieldAlert className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-700 dark:text-purple-300 font-mono tracking-tight">
            {stats.dbCounts.rateLimitHits}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-300 font-semibold mt-1">Slack alerts sent</div>
        </motion.div>
      </div>
    </motion.div>
  );
};

