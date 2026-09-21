import React, { useState } from 'react';
import { 
  X, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Trash2, 
  Database,
  ArrowRight,
  ShieldAlert,
  Layers
} from 'lucide-react';
import { UserProfile, UserDedicatedDatabase } from '../types';
import { UserDatabaseService } from '../services/userDatabaseService';

interface DatabaseResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onDatabaseReset: (newDb: UserDedicatedDatabase) => void;
  onFactoryReset?: () => void;
}

export function DatabaseResetModal({
  isOpen,
  onClose,
  currentUser,
  onDatabaseReset,
  onFactoryReset,
}: DatabaseResetModalProps) {
  const [resetType, setResetType] = useState<'standard' | 'expenses_only' | 'blank' | 'demo' | 'factory'>('standard');
  const [confirmWord, setConfirmWord] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleExecuteReset = async () => {
    if (confirmWord.trim().toUpperCase() !== 'RESET') {
      setFeedback({ type: 'error', message: 'Please type RESET to confirm.' });
      return;
    }

    setIsProcessing(true);
    setFeedback(null);

    try {
      if (resetType === 'factory') {
        UserDatabaseService.factoryResetAllData();
        setFeedback({ type: 'success', message: 'Factory reset completed. Reloading...' });
        setTimeout(() => {
          if (onFactoryReset) {
            onFactoryReset();
          } else {
            window.location.reload();
          }
        }, 800);
      } else if (resetType === 'expenses_only') {
        const freshDb = UserDatabaseService.clearUserExpenses(currentUser.id);
        onDatabaseReset(freshDb);
        setFeedback({ 
          type: 'success', 
          message: 'All daily expenses and pending swipes have been purged! Accounts remain intact.' 
        });
        setTimeout(() => {
          setIsProcessing(false);
          setConfirmWord('');
          onClose();
        }, 1000);
      } else {
        const freshDb = UserDatabaseService.resetUserDatabase(
          currentUser.id,
          resetType === 'blank' ? 'blank' : resetType === 'demo' ? 'demo' : 'standard'
        );
        onDatabaseReset(freshDb);
        setFeedback({ 
          type: 'success', 
          message: resetType === 'blank' 
            ? 'Database reset to a pristine blank slate!' 
            : resetType === 'demo'
            ? 'Database populated with demo accounts & sample transactions!'
            : 'Database refreshed to a clean restart: 0 debt balances and 0 pending swipes!' 
        });
        setTimeout(() => {
          setIsProcessing(false);
          setConfirmWord('');
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Reset failed' });
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Reset Database for Fresh Restart</span>
              </h2>
              <p className="text-xs text-slate-400">
                Partition: <code className="text-indigo-300 font-mono">{currentUser.databaseId}</code> ({currentUser.name})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Warning Banner */}
          <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/50 flex items-start gap-3 text-rose-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-rose-300">Caution: </span>
              This will overwrite your existing financial accounts, logged expenses, installments, and payment schedules with a clean restart.
            </div>
          </div>

          {/* Preset Choices */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-slate-300">
              Select Fresh Restart Mode
            </label>

            <div className="space-y-2">
              {/* Clean Standard Starter */}
              <label 
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  resetType === 'standard'
                    ? 'bg-indigo-950/40 border-indigo-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="resetType"
                  value="standard"
                  checked={resetType === 'standard'}
                  onChange={() => setResetType('standard')}
                  className="mt-1 accent-indigo-500"
                />
                <div className="space-y-1">
                  <div className="text-xs font-bold flex items-center gap-1.5 text-indigo-300">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Clean Fresh Restart (0 Debt & 0 Swipes - Recommended)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Restores clean starter cards and bank account with RM 0 debt balance, 0 logged expenses, and 0 pending swipes awaiting settlement.
                  </p>
                </div>
              </label>

              {/* Wipe Expenses & Swipes Only */}
              <label 
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  resetType === 'expenses_only'
                    ? 'bg-emerald-950/40 border-emerald-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="resetType"
                  value="expenses_only"
                  checked={resetType === 'expenses_only'}
                  onChange={() => setResetType('expenses_only')}
                  className="mt-1 accent-emerald-500"
                />
                <div className="space-y-1">
                  <div className="text-xs font-bold flex items-center gap-1.5 text-emerald-300">
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Purge Only Daily Expenses & Recent Swipes</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Keeps your linked cards, bank accounts, and standing instructions untouched, but wipes all logged daily expenses and pending swipes awaiting settlement.
                  </p>
                </div>
              </label>

              {/* Blank Slate */}
              <label 
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  resetType === 'blank'
                    ? 'bg-amber-950/30 border-amber-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="resetType"
                  value="blank"
                  checked={resetType === 'blank'}
                  onChange={() => setResetType('blank')}
                  className="mt-1 accent-amber-500"
                />
                <div className="space-y-1">
                  <div className="text-xs font-bold flex items-center gap-1.5 text-amber-300">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Completely Blank Slate</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Wipes all accounts, expenses, installments, and standing instructions to 0. Keeps your user profile and settings intact so you can enter your real data from scratch.
                  </p>
                </div>
              </label>

              {/* Demo Starter with Sample Transactions */}
              <label 
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  resetType === 'demo'
                    ? 'bg-blue-950/40 border-blue-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="resetType"
                  value="demo"
                  checked={resetType === 'demo'}
                  onChange={() => setResetType('demo')}
                  className="mt-1 accent-blue-500"
                />
                <div className="space-y-1">
                  <div className="text-xs font-bold flex items-center gap-1.5 text-blue-300">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>Demo Mode (With Sample Transactions & Swipes)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Populates accounts with 6 sample expenses, recurring bills, and 2 active installment plans for testing and demonstration purposes.
                  </p>
                </div>
              </label>

              {/* Factory Reset */}
              <label 
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  resetType === 'factory'
                    ? 'bg-rose-950/40 border-rose-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="resetType"
                  value="factory"
                  checked={resetType === 'factory'}
                  onChange={() => setResetType('factory')}
                  className="mt-1 accent-rose-500"
                />
                <div className="space-y-1">
                  <div className="text-xs font-bold flex items-center gap-1.5 text-rose-300">
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Factory Reset (All Users & Devices)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Completely purges all registered user accounts, partner links, and database files from browser storage. Returns to initial onboarding screen.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Type RESET to Confirm */}
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <label className="block text-xs font-semibold text-slate-300">
              Type <span className="font-mono text-rose-400 bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-900">RESET</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmWord}
              onChange={(e) => setConfirmWord(e.target.value)}
              placeholder="RESET"
              className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-colors font-mono uppercase tracking-wider"
            />
          </div>

          {feedback && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/50 border border-emerald-800/60 text-emerald-300'
                : 'bg-rose-950/50 border border-rose-800/60 text-rose-300'
            }`}>
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecuteReset}
            disabled={confirmWord.trim().toUpperCase() !== 'RESET' || isProcessing}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 rounded-xl shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
          >
            <RotateCcw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>{isProcessing ? 'Resetting Database...' : 'Confirm Fresh Restart'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
