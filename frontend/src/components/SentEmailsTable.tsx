'use client';

import React, { useState } from 'react';
import { ScheduledEmailItem } from '../lib/api';
import { Search, CheckCircle2, AlertCircle, ExternalLink, MailCheck, Eye, Sparkles, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SentEmailsTableProps {
  items: ScheduledEmailItem[];
  loading: boolean;
  onSearch: (query: string, status: string) => void;
  onSelectEmail: (item: ScheduledEmailItem) => void;
}

export const SentEmailsTable: React.FC<SentEmailsTableProps> = ({
  items,
  loading,
  onSearch,
  onSelectEmail,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    onSearch(q, statusFilter);
  };

  const handleFilterChange = (status: string) => {
    setStatusFilter(status);
    onSearch(searchQuery, status);
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
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-400/5 dark:bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Search Bar & Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 relative z-10">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-600 dark:text-brand-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search sent emails via Elasticsearch..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all shadow-sm font-medium"
          />
        </div>

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
            All Sent
          </button>
          <button
            onClick={() => handleFilterChange('SENT')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === 'SENT'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5'
            }`}
          >
            Delivered (Live & Sandbox)
          </button>
          <button
            onClick={() => handleFilterChange('FAILED')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === 'FAILED'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5'
            }`}
          >
            Failed
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center space-y-3">
          <div className="h-9 w-9 border-3 border-emerald-600 dark:border-emerald-400 border-t-transparent rounded-full animate-spin shadow-md shadow-emerald-500/20" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wide">Querying Elasticsearch email index...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        /* Empty State */
        <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 shadow-sm">
            <MailCheck className="h-10 w-10 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">No Email Archives Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
              No email records match the selected status filter ({statusFilter}).
            </p>
          </div>
        </div>
      ) : (
        /* Table */
        <div className="overflow-x-auto relative z-10 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-950/60 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.03] text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Recipient Email</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4">Sender Email</th>
                <th className="py-3.5 px-4">Sent Timestamp</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Mailbox / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
              <AnimatePresence>
                {filteredItems.map((item, idx) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                    onClick={() => onSelectEmail(item)}
                    className="hover:bg-brand-50/50 dark:hover:bg-brand-500/[0.08] cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors">
                      {item.recipientEmail}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-800 dark:text-slate-200 font-semibold">{item.subject}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400 text-[11px]">{item.senderEmail}</td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {item.sentAt
                        ? new Date(item.sentAt).toLocaleString([], {
                            dateStyle: 'short',
                            timeStyle: 'medium',
                          })
                        : new Date(item.createdAt).toLocaleString([], {
                            dateStyle: 'short',
                            timeStyle: 'medium',
                          })}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.status === 'SENT' ? (
                        item.etherealPreviewUrl ? (
                          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 flex items-center space-x-1.5 w-fit shadow-sm">
                            <CheckCircle2 className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                            <span>Sent (Ethereal Sandbox)</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40 flex items-center space-x-1.5 w-fit badge-green-glow">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Sent (Live Inbox)</span>
                          </span>
                        )
                      ) : (
                        <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40 flex items-center space-x-1.5 w-fit shadow-sm">
                          <AlertCircle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {item.etherealPreviewUrl ? (
                        <a
                          href={item.etherealPreviewUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center space-x-1 px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 text-[11px] font-bold transition-all shadow-sm hover:scale-105"
                        >
                          <span>Ethereal Preview</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEmail(item);
                          }}
                          className="inline-flex items-center space-x-1 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40 text-[11px] font-bold transition-all shadow-sm hover:scale-105"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View Body</span>
                        </button>
                      )}
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

