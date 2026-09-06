import React from 'react';
import { 
  Bell, 
  Plus, 
  Sparkles, 
  CreditCard,
  Database,
  ArrowRightLeft,
  LogOut
} from 'lucide-react';
import { CustomAlert, UserProfile } from '../types';
import { CurrencyCode } from '../utils/currency';
import { CurrencySelector } from './CurrencySelector';

interface NavbarProps {
  currentUser: UserProfile;
  alerts: CustomAlert[];
  currentCurrency: CurrencyCode;
  onCurrencyChange: (newCurrency: CurrencyCode) => void;
  onOpenAlerts: () => void;
  onOpenConnectBank: () => void;
  onOpenAIAdvisor: () => void;
  onOpenFamilySync: () => void;
  onLogout: () => void;
  onSyncAll: () => void;
  isSyncing: boolean;
  lastSyncedTime: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  alerts,
  currentCurrency,
  onCurrencyChange,
  onOpenAlerts,
  onOpenConnectBank,
  onOpenAIAdvisor,
  onOpenFamilySync,
  onLogout,
  onSyncAll,
  isSyncing,
}) => {
  const unreadAlerts = alerts.filter((a) => !a.read);
  const urgentCount = unreadAlerts.filter((a) => a.severity === 'urgent').length;
  const isHusband = currentUser.familyRole === 'husband';

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-500 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">BillFlow</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Float Optimizer
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="hidden sm:inline">Household: {currentUser.householdName}</span>
                <span className="hidden md:inline text-slate-600">•</span>
                <span className="hidden md:flex items-center gap-1 text-[11px] text-indigo-300 font-mono">
                  <Database className="w-3 h-3 text-indigo-400" />
                  <span>{currentUser.databaseId}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Actions & Status */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Family Sync Button */}
            <button
              id="btn-open-family-sync"
              onClick={onOpenFamilySync}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-950/80 hover:bg-indigo-900/90 text-indigo-300 border border-indigo-500/40 transition-all cursor-pointer shadow-sm hover:shadow-indigo-500/20"
              title="Export or import synchronization data for husband/wife & family members"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Family Sync</span>
              <span className="sm:hidden">Sync</span>
            </button>

            {/* AI Advisor Button */}
            <button
              id="btn-open-ai-advisor"
              onClick={onOpenAIAdvisor}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>AI Strategist</span>
            </button>

            {/* Connect Bank Button */}
            <button
              id="btn-connect-account"
              onClick={onOpenConnectBank}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Connect Account</span>
              <span className="md:hidden">Add</span>
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

            {/* Currency Selector (Default MYR) */}
            <CurrencySelector
              currentCurrency={currentCurrency}
              onCurrencyChange={onCurrencyChange}
            />

            {/* User Profile Badge & Quick Switch */}
            <div className="flex items-center gap-2 pl-1 border-l border-slate-800 ml-1">
              <button
                onClick={onOpenFamilySync}
                className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 cursor-pointer transition-colors"
                title={`Active: ${currentUser.name} (${currentUser.familyRole}). Click to manage family sync & profiles.`}
              >
                <div className={`w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-xs ${
                  isHusband ? 'bg-blue-600' : 'bg-rose-600'
                }`}>
                  {isHusband ? 'H' : 'W'}
                </div>
                <div className="text-left hidden lg:block pr-1">
                  <div className="text-[11px] font-bold text-white leading-tight truncate max-w-[100px]">
                    {currentUser.name}
                  </div>
                  <div className="text-[9px] text-slate-400 capitalize flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{currentUser.familyRole}</span>
                  </div>
                </div>
              </button>

              <button
                onClick={onLogout}
                className="text-slate-500 hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Log out or switch user account"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
