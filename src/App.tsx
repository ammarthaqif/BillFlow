/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { ExecutiveOverview } from './components/ExecutiveOverview';
import { PaymentOptimizerMatrix } from './components/PaymentOptimizerMatrix';
import { CycleGraceVisualizer } from './components/CycleGraceVisualizer';
import { InstallmentsCashFlowTracker } from './components/InstallmentsCashFlowTracker';
import { BankSyncModal } from './components/BankSyncModal';
import { AIAdvisorModal } from './components/AIAdvisorModal';
import { AlertsDrawer } from './components/AlertsDrawer';
import { 
  BillAccount, 
  InstallmentPlan, 
  UserSettings, 
  PaymentStrategyType, 
  CustomAlert 
} from './types';
import { 
  calculatePaymentSchedule, 
  generateAlerts, 
  projectMonthlyCashFlow 
} from './utils/paymentOptimizer';
import { 
  Sliders, 
  Calendar, 
  ShoppingBag, 
  Building2, 
  CreditCard,
  Wallet,
  Sparkles, 
  RefreshCw, 
  ShieldCheck, 
  Trash2,
  Edit2
} from 'lucide-react';

export default function App() {
  // State: Accounts
  const [accounts, setAccounts] = useState<BillAccount[]>([]);
  // State: Installments
  const [installments, setInstallments] = useState<InstallmentPlan[]>([]);
  // State: User settings
  const [settings, setSettings] = useState<UserSettings>({
    monthlyIncome: 6500.0,
    paycheckSchedule: 'bi_monthly',
    paycheckDates: [1, 15],
    allocatedCashForBills: 3500.0,
    alertDaysBeforeDue: [7, 3, 1],
    defaultStrategy: 'grace_float',
  });

  // Active view tab
  const [activeTab, setActiveTab] = useState<'optimizer' | 'cycle_matrix' | 'installments' | 'accounts'>('optimizer');

  // Strategy & Simulation Cash
  const [strategy, setStrategy] = useState<PaymentStrategyType>('grace_float');
  const [allocatedCash, setAllocatedCash] = useState<number>(3500);

  // Paid & Scheduled state sets
  const [paidScheduleIds, setPaidScheduleIds] = useState<Set<string>>(new Set());
  const [scheduledScheduleIds, setScheduledScheduleIds] = useState<Set<string>>(new Set());

  // Alerts
  const [alerts, setAlerts] = useState<CustomAlert[]>([]);
  const [alertThresholds, setAlertThresholds] = useState<number[]>([7, 3, 1]);

  // Modals
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isConnectBankOpen, setIsConnectBankOpen] = useState(false);
  const [isAIAdvisorOpen, setIsAIAdvisorOpen] = useState(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('Just now');

  // Fetch initial accounts and installments from server
  useEffect(() => {
    async function loadData() {
      try {
        const [accRes, instRes] = await Promise.all([
          fetch('/api/accounts'),
          fetch('/api/installments'),
        ]);
        if (accRes.ok) {
          const accData = await accRes.json();
          setAccounts(accData.accounts || []);
          if (accData.settings) {
            setSettings(accData.settings);
            setAllocatedCash(accData.settings.allocatedCashForBills || 3500);
            setStrategy(accData.settings.defaultStrategy || 'grace_float');
          }
        }
        if (instRes.ok) {
          const instData = await instRes.json();
          setInstallments(instData.installments || []);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    }
    loadData();
  }, []);

  // Update dynamic alerts whenever accounts or installments change
  useEffect(() => {
    if (accounts.length > 0) {
      const generated = generateAlerts(accounts, installments);
      setAlerts(generated);
    }
  }, [accounts, installments]);

  // Calculations
  const totalStatementDue = useMemo(
    () => accounts.reduce((sum, a) => sum + a.statementBalance, 0),
    [accounts]
  );
  const totalMinRequired = useMemo(
    () => accounts.reduce((sum, a) => sum + a.minPayment, 0),
    [accounts]
  );

  const schedule = useMemo(
    () => calculatePaymentSchedule(accounts, strategy, allocatedCash, settings.paycheckDates),
    [accounts, strategy, allocatedCash, settings.paycheckDates]
  );

  const projections = useMemo(
    () => projectMonthlyCashFlow(accounts, installments, settings.monthlyIncome, 6),
    [accounts, installments, settings.monthlyIncome]
  );

  // Sync all balances with Open Banking API simulation
  const handleSyncAll = async (provider = 'OpenBanking Sandbox') => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (data.accounts) {
        setAccounts(data.accounts);
      }
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Add new account
  const handleAddAccount = async (newAcc: Omit<BillAccount, 'id' | 'apiSynced' | 'lastSyncedAt' | 'status' | 'accountNumberMask'>) => {
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAcc),
      });
      const created = await res.json();
      setAccounts((prev) => [...prev, created]);
    } catch (err) {
      console.error('Failed to add account:', err);
    }
  };

  // Delete account
  const handleDeleteAccount = async (id: string) => {
    try {
      await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setInstallments((prev) => prev.filter((i) => i.accountId !== id));
    } catch (err) {
      console.error('Failed to delete account:', err);
    }
  };

  // Add new installment plan
  const handleAddInstallment = async (plan: Omit<InstallmentPlan, 'id'>) => {
    try {
      const res = await fetch('/api/installments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      });
      const created = await res.json();
      setInstallments((prev) => [...prev, created]);
    } catch (err) {
      console.error('Failed to add installment:', err);
    }
  };

  // Delete installment plan
  const handleDeleteInstallment = async (id: string) => {
    try {
      await fetch(`/api/installments/${id}`, { method: 'DELETE' });
      setInstallments((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error('Failed to delete installment:', err);
    }
  };

  // Toggle paid / scheduled status for schedule items
  const handleToggleScheduleStatus = (scheduleId: string) => {
    if (paidScheduleIds.has(scheduleId)) {
      // Unmark
      setPaidScheduleIds((prev) => {
        const next = new Set(prev);
        next.delete(scheduleId);
        return next;
      });
    } else if (scheduledScheduleIds.has(scheduleId)) {
      // Move from scheduled to paid
      setScheduledScheduleIds((prev) => {
        const next = new Set(prev);
        next.delete(scheduleId);
        return next;
      });
      setPaidScheduleIds((prev) => new Set(prev).add(scheduleId));
    } else {
      // Move to scheduled
      setScheduledScheduleIds((prev) => new Set(prev).add(scheduleId));
    }
  };

  // Mark single alert as read
  const handleMarkAlertRead = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  // Clear all alerts
  const handleClearAllAlerts = () => {
    setAlerts([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white pb-16">
      {/* Top Navigation */}
      <Navbar
        alerts={alerts}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onOpenConnectBank={() => setIsConnectBankOpen(true)}
        onOpenAIAdvisor={() => setIsAIAdvisorOpen(true)}
        onSyncAll={() => handleSyncAll()}
        isSyncing={isSyncing}
        lastSyncedTime={lastSyncedTime}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Executive Summary Metrics & Utilization */}
        <ExecutiveOverview
          accounts={accounts}
          installments={installments}
          settings={settings}
        />

        {/* View Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-800 pb-2 text-xs font-semibold scrollbar-none">
          <button
            id="tab-optimizer"
            onClick={() => setActiveTab('optimizer')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'optimizer'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Payment Sequencing & Optimizer</span>
          </button>

          <button
            id="tab-cycle-matrix"
            onClick={() => setActiveTab('cycle_matrix')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'cycle_matrix'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Cycle Dates & Grace Float Matrix</span>
          </button>

          <button
            id="tab-installments"
            onClick={() => setActiveTab('installments')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'installments'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Multi-Month Installments & Cash Flow</span>
          </button>

          <button
            id="tab-accounts"
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'accounts'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Linked Accounts ({accounts.length})</span>
          </button>
        </div>

        {/* Tab 1: Payment Optimizer & Sequencing Engine */}
        {activeTab === 'optimizer' && (
          <PaymentOptimizerMatrix
            accounts={accounts}
            schedule={schedule}
            strategy={strategy}
            onSelectStrategy={setStrategy}
            allocatedCash={allocatedCash}
            onUpdateAllocatedCash={setAllocatedCash}
            totalStatementDue={totalStatementDue}
            totalMinRequired={totalMinRequired}
            onToggleStatus={handleToggleScheduleStatus}
            paidScheduleIds={paidScheduleIds}
            scheduledScheduleIds={scheduledScheduleIds}
          />
        )}

        {/* Tab 2: Cycle Dates & Grace Float Architecture */}
        {activeTab === 'cycle_matrix' && <CycleGraceVisualizer accounts={accounts} />}

        {/* Tab 3: Multi-Month Installments & Cash Flow Trajectory */}
        {activeTab === 'installments' && (
          <InstallmentsCashFlowTracker
            accounts={accounts}
            installments={installments}
            projections={projections}
            onAddInstallment={handleAddInstallment}
            onDeleteInstallment={handleDeleteInstallment}
          />
        )}

        {/* Tab 4: Linked Accounts & Open Banking Hub */}
        {activeTab === 'accounts' && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                    <Building2 className="w-5 h-5" />
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Synced Financial Accounts Hub
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Manage credit card lines, e-wallet pay later limits, statement cycle days, and grace period settings.
                </p>
              </div>

              <button
                onClick={() => setIsConnectBankOpen(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <span>+ Connect New Account</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((acc) => {
                const utilRatio = Math.round((acc.totalBalance / acc.creditLimit) * 100);

                const getAccountTypeIcon = (accType: string) => {
                  if (accType === 'bank_account') return <Building2 className="w-4 h-4" />;
                  if (accType === 'ewallet_pay_later') return <Wallet className="w-4 h-4" />;
                  return <CreditCard className="w-4 h-4" />;
                };

                const getAccountTypeLabel = (accType: string) => {
                  if (accType === 'bank_account') return 'Bank Credit Line';
                  if (accType === 'ewallet_pay_later') return 'Pay Later E-Wallet';
                  return 'Credit Card';
                };

                return (
                  <div
                    key={acc.id}
                    className="bg-slate-800/40 rounded-xl border border-slate-800 p-4 space-y-3 relative group hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-sm transition-transform group-hover:scale-105"
                          style={{
                            backgroundColor: `${acc.color}18`,
                            borderColor: `${acc.color}45`,
                            color: acc.color,
                          }}
                          title={getAccountTypeLabel(acc.type)}
                        >
                          {getAccountTypeIcon(acc.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-white">{acc.name}</span>
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider border"
                              style={{
                                backgroundColor: `${acc.color}15`,
                                borderColor: `${acc.color}35`,
                                color: acc.color,
                              }}
                            >
                              {getAccountTypeLabel(acc.type)}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">{acc.institution} • {acc.accountNumberMask}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteAccount(acc.id)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Disconnect Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-700/50">
                      <div>
                        <span className="text-[11px] text-slate-400">Total Balance</span>
                        <div className="font-bold text-white">${acc.totalBalance.toFixed(2)}</div>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400">Statement Due</span>
                        <div className="font-bold text-amber-400">${acc.statementBalance.toFixed(2)}</div>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400">Cycle Cutoff</span>
                        <div className="font-medium text-slate-200">Day {acc.cycleDay} of month</div>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400">Grace Float</span>
                        <div className="font-medium text-emerald-400">{acc.gracePeriodDays} Days</div>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400">APR Rate</span>
                        <div className="font-medium text-slate-200">{acc.apr}%</div>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400">Late Penalty</span>
                        <div className="font-medium text-rose-400">${acc.lateFee}</div>
                      </div>
                    </div>

                    {/* Utilization mini-bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Limit: ${acc.creditLimit.toLocaleString()}</span>
                        <span className={utilRatio > 50 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                          {utilRatio}% used
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            utilRatio > 50 ? 'bg-rose-500' : utilRatio > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, utilRatio)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* App Footer Signature */}
      <footer className="mt-14 pt-6 border-t border-slate-800/80 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>BillFlow Intelligent Payment Sequencer & Cash Flow Platform</span>
        </div>
        <div className="font-medium text-slate-400">
          Developed by <span className="text-indigo-400 font-semibold">Ammar Thaqif</span>
        </div>
        <div className="text-[11px] text-slate-500">
          Zero-Late-Fee Guarantee • Continuous Integration Ready
        </div>
      </footer>

      {/* Modals & Slide-Overs */}
      <BankSyncModal
        isOpen={isConnectBankOpen}
        onClose={() => setIsConnectBankOpen(false)}
        accounts={accounts}
        onAddAccount={handleAddAccount}
        onSyncBank={handleSyncAll}
        isSyncing={isSyncing}
      />

      <AIAdvisorModal
        isOpen={isAIAdvisorOpen}
        onClose={() => setIsAIAdvisorOpen(false)}
        accounts={accounts}
        strategy={strategy}
        liquidCash={allocatedCash}
      />

      <AlertsDrawer
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
        onMarkRead={handleMarkAlertRead}
        onClearAll={handleClearAllAlerts}
        alertThresholds={alertThresholds}
        onUpdateThresholds={setAlertThresholds}
      />
    </div>
  );
}
