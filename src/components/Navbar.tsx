import React from 'react';
import { 
  ShieldCheck, 
  RefreshCw, 
  Bell, 
  Plus, 
  Sparkles, 
  CreditCard,
  CheckCircle2
} from 'lucide-react';
import { CustomAlert } from '../types';

interface NavbarProps {
  alerts: CustomAlert[];
  onOpenAlerts: () => void;
  onOpenConnectBank: () => void;
  onOpenAIAdvisor: () => void;
  onSyncAll: () => void;
  isSyncing: boolean;
  lastSyncedTime: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  alerts,
  onOpenAlerts,
  onOpenConnectBank,
  onOpenAIAdvisor,
  onSyncAll,
  isSyncing,
  lastSyncedTime,
}) => {
  const unreadAlerts = alerts.filter((a) => !a.read);
  const urgentCount = unreadAlerts.filter((a) => a.severity === 'urgent').length;

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-500 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">BillFlow</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Float & Grace Optimizer
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Multi-Card & E-Wallet Payment Strategizer
              </p>
            </div>
          </div>

          {/* Actions & Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Open Banking Sync Status & Button */}
            <div className="hidden md:flex items-center gap-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-medium">Bank APIs Synced</span>
              <span className="text-slate-500">|</span>
              <button
                id="btn-sync-all"
                onClick={onSyncAll}
                disabled={isSyncing}
                className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer transition-colors disabled:opacity-50"
                title="Sync live balances across all credit cards and e-wallet accounts"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Balances'}</span>
              </button>
            </div>

            {/* AI Advisor Button */}
            <button
              id="btn-open-ai-advisor"
              onClick={onOpenAIAdvisor}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>AI Strategist</span>
            </button>

            {/* Connect Bank Button */}
            <button
              id="btn-connect-account"
              onClick={onOpenConnectBank}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Connect Account</span>
              <span className="sm:hidden">Add</span>
            </button>

            {/* Notification Bell */}
            <button
              id="btn-alerts-toggle"
              onClick={onOpenAlerts}
              className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
              title="Upcoming Deadline Alerts"
            >
              <Bell className="w-4 h-4" />
              {unreadAlerts.length > 0 && (
                <span
                  className={`absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full text-white shadow ${
                    urgentCount > 0 ? 'bg-rose-500 animate-bounce' : 'bg-amber-500'
                  }`}
                >
                  {unreadAlerts.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
