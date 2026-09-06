import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  HelpCircle, 
  Zap, 
  CreditCard, 
  Wallet, 
  ArrowRight,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { BillAccount } from '../types';

interface CycleGraceVisualizerProps {
  accounts: BillAccount[];
}

export const CycleGraceVisualizer: React.FC<CycleGraceVisualizerProps> = ({ accounts }) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Calendar className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Cycle Dates & Grace Period Float Architecture
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Visualizing statement cutoff dates, interest-free float windows, and penalty thresholds across cards & BNPL.
          </p>
        </div>

        {/* Float Arbitrage Badge */}
        <div className="flex items-center gap-2 bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 px-3 py-1.5 rounded-xl text-xs font-medium self-start sm:self-auto">
          <Zap className="w-3.5 h-3.5 text-amber-300" />
          <span>Max Float: 55 Days with Cycle Timing</span>
        </div>
      </div>

      {/* Account Comparison Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account Selector List */}
        <div className="space-y-2 lg:col-span-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Select Account to Inspect Cycle
          </label>
          <div className="space-y-1.5">
            {accounts.map((acc) => {
              const isSelected = acc.id === selectedAccountId;
              return (
                <button
                  key={acc.id}
                  onClick={() => setSelectedAccountId(acc.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-slate-800 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800/70 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: acc.color }}
                    />
                    <div className="truncate">
                      <div className="text-xs font-bold truncate text-white">{acc.name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span>Cycle Day {acc.cycleDay}</span>
                        <span>•</span>
                        <span className="text-emerald-400">{acc.gracePeriodDays}d grace</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-500 ${isSelected ? 'text-indigo-400' : ''}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Cycle & Grace Timeline for Selected Account */}
        {selectedAccount && (
          <div className="lg:col-span-2 bg-slate-800/50 rounded-xl border border-slate-700/60 p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-white">{selectedAccount.name}</h3>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      selectedAccount.type === 'credit_card'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                    }`}
                  >
                    {selectedAccount.type === 'credit_card' ? 'Credit Card' : 'E-Wallet Pay Later'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{selectedAccount.institution} • {selectedAccount.accountNumberMask}</div>
              </div>

              <div className="text-left sm:text-right">
                <div className="text-xs text-slate-400">Late Penalty Fee</div>
                <div className="text-sm font-bold text-rose-400">
                  ${selectedAccount.lateFee} + {selectedAccount.apr}% APR
                </div>
              </div>
            </div>

            {/* Interactive Timeline Visualizer */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Cycle Progression Timeline</span>
                <span className="text-emerald-400 font-bold">{selectedAccount.gracePeriodDays} Days Grace Float</span>
              </div>

              {/* Graphical Step Bar */}
              <div className="relative pt-6 pb-2">
                {/* Horizontal Track */}
                <div className="h-2 bg-slate-700 rounded-full relative overflow-hidden flex">
                  {/* Billing cycle portion */}
                  <div className="w-1/2 bg-indigo-500/70 h-full" title="30-Day Billing Cycle" />
                  {/* Grace period portion */}
                  <div className="w-1/2 bg-emerald-500 h-full" title="Grace Period Window" />
                </div>

                {/* Markers */}
                <div className="flex justify-between text-[11px] mt-2">
                  <div className="text-left">
                    <span className="block font-semibold text-slate-200">Cycle Open</span>
                    <span className="text-slate-400">Day {selectedAccount.cycleDay + 1 > 31 ? 1 : selectedAccount.cycleDay + 1}</span>
                  </div>

                  <div className="text-center">
                    <span className="block font-semibold text-indigo-300">Statement Cutoff</span>
                    <span className="text-slate-400">Day {selectedAccount.cycleDay}</span>
                  </div>

                  <div className="text-right">
                    <span className="block font-semibold text-rose-400">Due Date (Grace Closes)</span>
                    <span className="text-slate-400">{selectedAccount.dueDate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cycle Parameters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Cycle Closing Day</span>
                <strong className="text-white text-sm">Day {selectedAccount.cycleDay}</strong>
                <span className="text-[10px] text-slate-500 block mt-0.5">Monthly statement cut</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Grace Period</span>
                <strong className="text-emerald-400 text-sm">{selectedAccount.gracePeriodDays} Days</strong>
                <span className="text-[10px] text-slate-500 block mt-0.5">0% interest window</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Minimum Due</span>
                <strong className="text-amber-400 text-sm">${selectedAccount.minPayment.toFixed(2)}</strong>
                <span className="text-[10px] text-slate-500 block mt-0.5">Avoids late fee</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Max Potential Float</span>
                <strong className="text-indigo-300 text-sm">{selectedAccount.gracePeriodDays + 30} Days</strong>
                <span className="text-[10px] text-slate-500 block mt-0.5">Purchases on Day +1</span>
              </div>
            </div>

            {/* Float Arbitrage Pro-Tip */}
            <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-lg p-3 text-xs text-emerald-200 flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-white">Float Arbitrage Strategy:</strong> To maximize cash in your high-yield savings or checking account, make big expenditures on <strong>Day {selectedAccount.cycleDay + 1}</strong> (immediately after the monthly statement closes). You will enjoy up to <strong>{selectedAccount.gracePeriodDays + 30} days</strong> of interest-free capital before that charge is due!
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
