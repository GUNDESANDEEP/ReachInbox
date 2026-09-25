'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Mail, Calendar, CheckCircle2, User, Clock } from 'lucide-react';
import { ScheduledEmailItem } from '../lib/api';

interface EmailDetailModalProps {
  email: ScheduledEmailItem | null;
  onClose: () => void;
}

export const EmailDetailModal: React.FC<EmailDetailModalProps> = ({ email, onClose }) => {
  if (!email) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl glass-panel bg-white/95 dark:bg-slate-900/95 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-2xl text-left overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white max-w-md truncate">{email.subject}</h2>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">ID: {email.id}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Email Info Bar */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs mb-5">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block mb-0.5">To (Recipient):</span>
              <span className="font-mono text-slate-900 dark:text-white font-bold">{email.recipientEmail}</span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block mb-0.5">From (Sender):</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{email.senderEmail}</span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block mb-0.5">Sent Timestamp:</span>
              <span className="text-slate-700 dark:text-slate-300 font-mono">
                {email.sentAt ? new Date(email.sentAt).toLocaleString() : 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block mb-0.5">Status:</span>
              <span className="inline-flex items-center space-x-1 text-emerald-700 dark:text-emerald-300 font-extrabold">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{email.status}</span>
              </span>
            </div>
          </div>

          {/* Body Content */}
          <div className="mb-6">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Message Body</h4>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs leading-relaxed whitespace-pre-wrap font-sans max-h-60 overflow-y-auto font-medium">
              {email.body}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            {email.etherealPreviewUrl ? (
              <a
                href={email.etherealPreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 text-xs font-extrabold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:shadow-indigo-500/30 flex items-center space-x-1.5 transition-all"
              >
                <span>View Email in Ethereal Fake SMTP</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-500">No Ethereal URL preview</span>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
