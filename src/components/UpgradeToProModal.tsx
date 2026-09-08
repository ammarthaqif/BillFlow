import React from 'react';
import { 
  Zap, 
  CheckCircle2, 
  X, 
  Crown, 
  Sparkles, 
  Receipt, 
  CalendarClock, 
  Building2, 
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { UserProfile } from '../types';

interface UpgradeToProModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUpgrade: () => void;
  featureTriggered?: string;
}

export const UpgradeToProModal: React.FC<UpgradeToProModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpgrade,
  featureTriggered,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider">
            <Crown className="w-3.5 h-3.5 fill-current" />
            <span>BillFlow Pro Power Pack</span>
          </div>
          <h2 className="text-2xl font-black text-white">Unlock Unlimited Financial Agility</h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            {featureTriggered ? (
              <span className="text-amber-400 font-semibold">{featureTriggered}</span>
            ) : (
              'Eliminate all monthly quotas, unlock unlimited card integrations, and automate standing instructions.'
            )}
          </p>
        </div>

        {/* Comparison Matrix */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 divide-y divide-slate-800/80 text-xs">
          <div className="pb-3 flex items-center justify-between font-semibold text-slate-400">
            <span>Capability</span>
            <div className="flex items-center gap-6">
              <span className="w-16 text-center text-slate-400">Free</span>
              <span className="w-20 text-center text-indigo-400 font-bold">Pro</span>
            </div>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-300">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>Linked Accounts & Cards</span>
            </span>
            <div className="flex items-center gap-6">
              <span className="w-16 text-center text-slate-400">3 max</span>
              <span className="w-20 text-center text-emerald-400 font-bold">Unlimited</span>
            </div>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-300">
              <CalendarClock className="w-4 h-4 text-slate-400" />
              <span>Standing Instructions & SI</span>
            </span>
            <div className="flex items-center gap-6">
              <span className="w-16 text-center text-slate-400">3 max</span>
              <span className="w-20 text-center text-emerald-400 font-bold">Unlimited</span>
            </div>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-300">
              <Sparkles className="w-4 h-4 text-slate-400" />
              <span>AI Payment Consultations</span>
            </span>
            <div className="flex items-center gap-6">
              <span className="w-16 text-center text-slate-400">3 / month</span>
              <span className="w-20 text-center text-emerald-400 font-bold">Unlimited</span>
            </div>
          </div>

          <div className="pt-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-300">
              <Receipt className="w-4 h-4 text-slate-400" />
              <span>Receipt Camera Extraction</span>
            </span>
            <div className="flex items-center gap-6">
              <span className="w-16 text-center text-slate-400">5 / month</span>
              <span className="w-20 text-center text-emerald-400 font-bold">Unlimited</span>
            </div>
          </div>
        </div>

        {/* Feature bullets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-slate-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Dedicated User DB & Auto-Save</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Zero-Late-Fee Sequence Matrix</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Immediate FPX Balance Relief</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Cross-Partner Family Sync</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => {
              onUpgrade();
              onClose();
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-indigo-600 to-violet-600 hover:from-amber-400 hover:via-indigo-500 hover:to-violet-500 text-white font-black text-sm tracking-wide shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Upgrade My Account to Pro Instantly</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>All limits raised immediately in your dedicated database.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
