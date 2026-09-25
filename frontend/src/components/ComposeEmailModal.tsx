'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, CheckCircle2, Calendar, Clock, Gauge, Mail, Sparkles, AlertCircle, FileText } from 'lucide-react';
import { parseLeadFile } from '../lib/csvParser';
import { scheduleCampaign } from '../lib/api';
import confetti from 'canvas-confetti';

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleSuccess: () => void;
  userEmail: string;
}

export const ComposeEmailModal: React.FC<ComposeEmailModalProps> = ({
  isOpen,
  onClose,
  onScheduleSuccess,
  userEmail,
}) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [senderEmail, setSenderEmail] = useState(userEmail || 'sender@reachinbox.com');
  const [recipientsText, setRecipientsText] = useState('');
  const [detectedLeads, setDetectedLeads] = useState<string[]>([]);
  const [leadFileName, setLeadFileName] = useState<string | null>(null);
  
  // Scheduling parameters
  const [scheduledForDate, setScheduledForDate] = useState<string>('');
  const [scheduledForTime, setScheduledForTime] = useState<string>('');
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(200);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await parseLeadFile(file);
      setDetectedLeads(result.emails);
      setLeadFileName(file.name);

      // Join parsed emails into recipients text area
      if (result.emails.length > 0) {
        setRecipientsText(result.emails.join(', '));
      }
    } catch (err) {
      console.error('File parsing error:', err);
      setErrorMessage('Failed to parse lead file');
    }
  };

  const handleTextChange = (text: string) => {
    setRecipientsText(text);
    const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const unique = Array.from(new Set(matches.map((m) => m.toLowerCase())));
    setDetectedLeads(unique);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (detectedLeads.length === 0) {
      setErrorMessage('Please upload a CSV/text lead file or enter valid lead email addresses.');
      return;
    }

    if (!subject.trim() || !body.trim()) {
      setErrorMessage('Please enter email subject and body content.');
      return;
    }

    setLoading(true);

    try {
      let targetScheduledFor: string | undefined;
      if (scheduledForDate) {
        const timePart = scheduledForTime || '00:00';
        targetScheduledFor = new Date(`${scheduledForDate}T${timePart}`).toISOString();
      }

      const payload = {
        senderEmail,
        recipients: detectedLeads,
        subject: subject.trim(),
        body: body.trim(),
        scheduledFor: targetScheduledFor,
        delayMs: delaySeconds * 1000,
        hourlyLimit,
        userEmail,
      };

      await scheduleCampaign(payload);

      // Trigger celebration confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      onScheduleSuccess();
      onClose();
    } catch (err: any) {
      console.error('Schedule submission error:', err);
      setErrorMessage(err.message || 'Server error scheduling emails');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl glass-panel bg-white/95 dark:bg-slate-900/95 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-2xl text-left overflow-hidden my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-brand-600 to-purple-600 text-white shadow-md shadow-brand-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Schedule New ReachInbox Campaign</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">BullMQ delayed persistent queue scheduler</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Sender Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                Sender Email (Ethereal Fake SMTP)
              </label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="e.g. outreach@reachinbox.com"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-800 transition-all font-mono"
              />
            </div>

            {/* Lead File CSV/TXT Upload & Text Parsing */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                  Lead Recipients (CSV Upload or Paste Emails)
                </label>
                {detectedLeads.length > 0 && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 flex items-center space-x-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{detectedLeads.length} Lead(s) Detected</span>
                  </span>
                )}
              </div>

              {/* Upload Box */}
              <div className="relative mb-2">
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-400 rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-brand-50/50 dark:hover:bg-brand-950/30 transition-all group">
                  <div className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300">
                    <Upload className="h-4 w-4 text-brand-600 dark:text-brand-400 group-hover:scale-110 transition-transform" />
                    <span className="font-semibold">
                      {leadFileName ? `File selected: ${leadFileName}` : 'Click to Upload CSV / TXT Lead List'}
                    </span>
                  </div>
                  <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <textarea
                value={recipientsText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Or paste email addresses separated by commas or lines..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-800 transition-all font-mono"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Email Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Scaling ReachInbox Email Campaigns with BullMQ & Redis"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-800 transition-all font-medium"
              />
            </div>

            {/* Email Body */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Email Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Hi {lead_name},\n\nWe are excited to share our automated job scheduling pipeline..."
                rows={4}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-800 transition-all font-sans"
              />
            </div>

            {/* Scheduling & Rate Limits Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              {/* Start Date / Time */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                  Start Date & Time
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="date"
                    value={scheduledForDate}
                    onChange={(e) => setScheduledForDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[11px] focus:outline-none focus:border-brand-500"
                  />
                  <input
                    type="time"
                    value={scheduledForTime}
                    onChange={(e) => setScheduledForTime(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[11px] focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Delay between Emails */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                  Delay Between Sends
                </label>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[11px] font-mono focus:outline-none focus:border-brand-500"
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">sec</span>
                </div>
              </div>

              {/* Hourly Rate Limit */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Gauge className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                  Hourly Rate Limit
                </label>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={hourlyLimit}
                    onChange={(e) => setHourlyLimit(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[11px] font-mono focus:outline-none focus:border-brand-500"
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">/hr</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-xs font-extrabold rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-brand-500/20 hover:shadow-brand-500/40 flex items-center space-x-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Scheduling Jobs...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Schedule Campaign Jobs</span>
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
