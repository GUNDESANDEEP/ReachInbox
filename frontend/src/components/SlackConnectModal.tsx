'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Slack, CheckCircle2, ShieldAlert, Send, Unlink, Sparkles, Link as LinkIcon, Key } from 'lucide-react';
import { connectSlackWebhook, disconnectSlackWebhook, sendTestSlackAlert } from '../lib/api';

interface SlackConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  slackConnected: boolean;
  currentWebhookUrl?: string | null;
  userEmail: string;
  onStatusChange: () => void;
}

export const SlackConnectModal: React.FC<SlackConnectModalProps> = ({
  isOpen,
  onClose,
  slackConnected,
  currentWebhookUrl,
  userEmail,
  onStatusChange,
}) => {
  const [webhookUrl, setWebhookUrl] = useState(currentWebhookUrl || (typeof localStorage !== 'undefined' ? localStorage.getItem('reachinbox_slack_webhook') || '' : ''));
  const [isConnected, setIsConnected] = useState(slackConnected || (typeof localStorage !== 'undefined' && localStorage.getItem('reachinbox_slack_connected') === 'true'));
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const val = webhookUrl.trim();
    if (!val.startsWith('https://hooks.slack.com/') && !val.startsWith('xoxb-')) {
      setMessage({
        type: 'error',
        text: 'Please enter a valid Slack Incoming Webhook URL (starts with https://hooks.slack.com/) or Slack Bot Token (starts with xoxb-)',
      });
      return;
    }

    setLoading(true);
    try {
      await connectSlackWebhook(val, userEmail);
      setIsConnected(true);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('reachinbox_slack_connected', 'true');
        localStorage.setItem('reachinbox_slack_webhook', val);
      }
      setMessage({ type: 'success', text: 'Slack Webhook / Bot Token connected successfully!' });
      onStatusChange();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to connect Slack' });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setMessage(null);
    setLoading(true);
    try {
      await disconnectSlackWebhook(userEmail);
      setIsConnected(false);
      setWebhookUrl('');
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('reachinbox_slack_connected');
        localStorage.removeItem('reachinbox_slack_webhook');
      }
      setMessage({ type: 'success', text: 'Slack disconnected successfully.' });
      onStatusChange();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to disconnect Slack' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestAlert = async () => {
    setMessage(null);
    setTestLoading(true);
    try {
      await sendTestSlackAlert(userEmail);
      setMessage({
        type: 'success',
        text: '🎉 Live test rate-limit alert delivered to your Slack channel!',
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to send test Slack alert',
      });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg glass-panel bg-white/95 dark:bg-slate-900/95 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-2xl text-left overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40">
                <Slack className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Slack Notification Integration</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Live rate-limit hit alert notifications</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {message && (
            <div
              className={`mb-5 p-3.5 rounded-xl text-xs flex items-center space-x-2 border ${
                message.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Slack Webhook URL or Bot Token (xoxb-...)
              </label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/... or xoxb-12145169..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all font-mono"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                Accepts either a <strong>Slack Webhook URL</strong> or a <strong>Bot Token (xoxb-...)</strong>. When a sender hits their hourly limit, ReachInbox will post a live alert block.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              {isConnected ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl border border-rose-200 dark:border-rose-800 transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  <span>Disconnect Slack</span>
                </button>
              ) : (
                <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">Status: Not Connected</span>
              )}

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                {isConnected && (
                  <button
                    type="button"
                    onClick={handleSendTestAlert}
                    disabled={testLoading}
                    className="px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl border border-emerald-200 dark:border-emerald-800 transition-all flex items-center space-x-1.5"
                  >
                    <Send className={`h-3.5 w-3.5 ${testLoading ? 'animate-bounce' : ''}`} />
                    <span>Test Slack Alert</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-extrabold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/40 flex items-center space-x-1.5 transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{loading ? 'Saving...' : 'Save Token/Webhook'}</span>
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
