'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, X, Check, Copy, KeyRound, ExternalLink, ShieldCheck } from 'lucide-react';

export interface PreviewEmailData {
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  otp?: string;
  sentAt?: string;
  etherealPreviewUrl?: string | null;
}

interface InAppMailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  emailData: PreviewEmailData | null;
  onAutoFillOtp?: (otp: string) => void;
}

export const InAppMailPreviewModal: React.FC<InAppMailPreviewModalProps> = ({
  isOpen,
  onClose,
  emailData,
  onAutoFillOtp,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !emailData) return null;

  const handleCopyOtp = () => {
    if (emailData.otp) {
      navigator.clipboard.writeText(emailData.otp);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-slate-900 dark:text-white"
        >
          {/* Top Mail Header Bar */}
          <div className="bg-slate-100 dark:bg-slate-850 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center">
                <Mail className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>ReachInbox In-App Email Client</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase">
                    Delivered
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Simulated SMTP Mailer Output Preview
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Email Headers Info Box */}
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans font-semibold">From:</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">{emailData.sender}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans font-semibold">To:</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">{emailData.recipient}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800/80">
                <span className="text-slate-400 font-sans font-semibold">Subject:</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-xs">{emailData.subject}</span>
              </div>
            </div>

            {/* Email Rendered Body Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-inner">
              <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-300">
                {emailData.body}
              </div>

              {/* Special OTP Highlight Card */}
              {emailData.otp && (
                <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-brand-500/10 border border-purple-500/30 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
                      <KeyRound className="h-3 w-3" />
                      <span>Verification Code (OTP)</span>
                    </div>
                    <div className="text-2xl font-black font-mono tracking-[0.3em] text-slate-900 dark:text-white mt-0.5">
                      {emailData.otp}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopyOtp}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>

                    {onAutoFillOtp && (
                      <button
                        onClick={() => {
                          onAutoFillOtp(emailData.otp!);
                          onClose();
                        }}
                        className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold flex items-center gap-1.5 transition-colors shadow-md shadow-purple-500/20"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Auto-Fill Code</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* External Ethereal Link Fallback */}
            {emailData.etherealPreviewUrl && (
              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>External Ethereal Sandbox Link:</span>
                <a
                  href={emailData.etherealPreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  <span>Open raw Ethereal URL</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
