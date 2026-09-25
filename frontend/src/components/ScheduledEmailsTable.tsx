'use client';

import React, { useState } from 'react';
import { ScheduledEmailItem, cancelScheduledEmailApi } from '../lib/api';
import { Search, Clock, Trash2, Calendar, ShieldAlert, Sparkles, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScheduledEmailsTableProps {
  items: ScheduledEmailItem[];
  loading: boolean;
  onRefresh: () => void;
  onSearch: (query: string, status: string) => void;
  searchSource?: string;
}

export const ScheduledEmailsTable: React.FC<ScheduledEmailsTableProps> = ({
  items,
  loading,
  onRefresh,
  onSearch,
  searchSource,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    onSearch(q, statusFilter);
  };

  const handleFilterChange = (status: string) => {
    setStatusFilter(status);
    onSearch(searchQuery, status);
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled email?')) return;

    setCancellingId(id);
    try {
      await cancelScheduledEmailApi(id);
      onRefresh();
    } catch (err) {
      console.error('Failed to cancel email:', err);
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40 flex items-center space-x-1.5 w-fit shadow-sm">
            <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            <span>Scheduled</span>
          </span>
        );
      case 'RATE_LIMITED':
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/40 flex items-center space-x-1.5 w-fit badge-glowing">
            <ShieldAlert className="h-3 w-3 text-purple-600 dark:text-purple-400 animate-pulse" />
            <span>Rate Limited (Rescheduled)</span>
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 flex items-center space-x-1.5 w-fit shadow-sm">
            <div className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-ping" />
            <span>Sending...</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-500/40 w-fit">
            {status}
          </span>
        );
    }
  };

  const filteredItems = items.filter((item) => {
    if (statusFilter === 'ALL') return true;
    return item.status === statusFilter;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 p-6 overflow-hidden backdrop-blur-xl shadow-md shadow-slate-200/40 dark:shadow-2xl relative"
    >
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-400/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Search Bar & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 relative z-10">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-600 dark:text-brand-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search subject, recipient or body (Elasticsearch)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all shadow-sm font-medium"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          {searchSource && (
            <div className="text-[10px] font-mono font-bold px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 flex items-center space-x-1.5 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Search: {searchSource}</span>
            </div>
          )}

          <div className="flex items-center space-x-1.5 bg-slate-100/90 dark:bg-slate-900/80 p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-inner">
            <Filter className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 ml-2 mr-1" />
            <button
              onClick={() => handleFilterChange('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange('PENDING')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5'
              }`}
            >
              Scheduled
            </button>
            <button
              onClick={() => handleFilterChange('RATE_LIMITED')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === 'RATE_LIMITED'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5'
              }`}
            >
              Rate Limited
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center space-y-3">
          <div className="h-9 w-9 border-3 border-brand-600 dark:border-brand-400 border-t-transparent rounded-full animate-spin shadow-md shadow-brand-500/20" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wide">Fetching scheduled BullMQ job queue...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        /* Empty State */
        <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 shadow-sm">
            <Calendar className="h-10 w-10 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">No Scheduled Emails Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
              Click &quot;Schedule Campaign&quot; in the top bar to enqueue your first batch of email jobs into BullMQ.
            </p>
          </div>
        </div>
      ) : (
        /* Email Table */
        <div className="overflow-x-auto relative z-10 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-950/60 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.03] text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Recipient</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4">Scheduled Time</th>
                <th className="py-3.5 px-4">Throttling</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
              <AnimatePresence>
                {filteredItems.map((item, idx) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                    className="hover:bg-brand-50/50 dark:hover:bg-brand-500/[0.08] transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors">
                      {item.recipientEmail}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-800 dark:text-slate-200 font-semibold">
                      {item.subject}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {new Date(item.scheduledFor).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {((item.delayMs ? Number(item.delayMs) : 2000) / 1000).toFixed(0)}s delay | {item.hourlyLimit || 200}/hr
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(item.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleCancel(item.id)}
                        disabled={cancellingId === item.id}
                        className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                        title="Cancel Schedule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};

