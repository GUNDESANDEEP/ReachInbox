'use client';

import React from 'react';
import { UserProfile } from '../lib/api';
import { Mail, Slack, LogOut, Activity, Sparkles, CheckCircle2, ShieldAlert, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeaderProps {
  user: UserProfile;
  onLogout: () => void;
  onOpenSlackModal: () => void;
  activeTab: 'scheduled' | 'sent' | 'queue';
  setActiveTab: (tab: 'scheduled' | 'sent' | 'queue') => void;
  onOpenComposeModal: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onOpenSlackModal,
  activeTab,
  setActiveTab,
  onOpenComposeModal,
  theme,
  onToggleTheme,
}) => {
  const isDark = theme === 'dark';

  return (
    <header className={`sticky top-0 z-40 w-full glass-panel border-b transition-all duration-300 px-4 lg:px-8 py-3 shadow-sm ${
      isDark ? 'border-white/10 bg-slate-950/80' : 'border-slate-200/80 bg-white/80'
    }`}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center space-x-3.5">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 3 }}
            className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 p-0.5 shadow-md shadow-brand-500/20 flex items-center justify-center cursor-pointer"
          >
            <div className={`h-full w-full rounded-[14px] flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-white'}`}>
              <Mail className={`h-5 w-5 ${isDark ? 'text-brand-400' : 'text-brand-600'}`} />
            </div>
          </motion.div>
          <div>
            <div className="flex items-center space-x-2.5">
              <span className={`font-black text-xl tracking-tight drop-shadow-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                ReachInbox
              </span>
              <span className={`px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide rounded-full border badge-glowing ${
                isDark ? 'bg-brand-500/20 text-brand-300 border-brand-500/40' : 'bg-brand-50 text-brand-700 border-brand-200'
              }`}>
                Scheduler v2.0
              </span>
            </div>
            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Production Job Queue & Live Gmail SMTP
            </p>
          </div>
        </div>

        {/* Center Tabs Navigation */}
        <nav className={`flex items-center p-1.5 rounded-2xl border shadow-inner backdrop-blur-md ${
          isDark ? 'bg-slate-900/80 border-white/10' : 'bg-slate-100/90 border-slate-200/80'
        }`}>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`relative px-4 py-2 text-xs font-bold rounded-xl transition-all duration-300 flex items-center space-x-2 ${
              activeTab === 'scheduled'
                ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/20'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>Scheduled Emails</span>
          </button>

          <button
            onClick={() => setActiveTab('sent')}
            className={`relative px-4 py-2 text-xs font-bold rounded-xl transition-all duration-300 flex items-center space-x-2 ${
              activeTab === 'sent'
                ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/20'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>Sent Emails</span>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`relative px-4 py-2 text-xs font-bold rounded-xl transition-all duration-300 flex items-center space-x-2 ${
              activeTab === 'queue'
                ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/20'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Activity className={`h-3.5 w-3.5 animate-pulse ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span>BullMQ Monitor</span>
          </button>
        </nav>

        {/* Right Actions & User Profile & Theme Toggle */}
        <div className="flex items-center space-x-2.5">
          {/* Theme Switcher Button (Right Corner) */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: isDark ? 45 : -45 }}
            whileTap={{ scale: 0.9 }}
            onClick={onToggleTheme}
            className={`p-2.5 rounded-xl border transition-all shadow-sm flex items-center justify-center ${
              isDark
                ? 'bg-slate-900 text-amber-400 border-amber-500/30 hover:bg-slate-800'
                : 'bg-slate-100 text-indigo-600 border-slate-200 hover:bg-slate-200'
            }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Dark / Light Theme"
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-400 animate-spin-slow" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-600" />
            )}
          </motion.button>

          {/* Compose Email CTA */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onOpenComposeModal}
            className="px-4 py-2.5 text-xs font-extrabold rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/35 flex items-center space-x-2 transition-all border border-white/30"
          >
            <Sparkles className="h-4 w-4 text-amber-200" />
            <span>Schedule Campaign</span>
          </motion.button>

          {/* Slack Connection Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenSlackModal}
            className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center space-x-1.5 transition-all shadow-sm ${
              user.slackConnected
                ? isDark
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/20'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                : isDark
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 hover:bg-amber-500/20'
                : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
            }`}
            title="Slack Notification Integration"
          >
            <Slack className={`h-3.5 w-3.5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <span>{user.slackConnected ? 'Slack Active' : 'Connect Slack'}</span>
            {user.slackConnected ? (
              <CheckCircle2 className={`h-3.5 w-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            ) : (
              <ShieldAlert className={`h-3.5 w-3.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            )}
          </motion.button>

          {/* User Profile Pill */}
          <div className={`flex items-center space-x-2 pl-2.5 border-l ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="relative">
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email)}`}
                alt={user.name}
                className={`h-9 w-9 rounded-full border-2 shadow-sm object-cover ${
                  isDark ? 'border-brand-400/50 bg-slate-800' : 'border-brand-300 bg-slate-100'
                }`}
              />
              <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 ${
                isDark ? 'border-slate-950' : 'border-white'
              }`} />
            </div>
            <div className="hidden xl:block text-left">
              <div className={`text-xs font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>{user.name}</div>
              <div className={`text-[10px] font-mono truncate max-w-[120px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user.email}</div>
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onLogout}
              className={`p-2 rounded-xl transition-colors ${
                isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
              }`}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </div>
    </header>
  );
};


