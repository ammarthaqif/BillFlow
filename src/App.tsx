import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BillAccount, 
  InstallmentPlan, 
  UserSettings, 
  PaymentStrategyType, 
  CustomAlert,
  UserProfile,
  UserDedicatedDatabase
} from './types';
import { 
  INITIAL_ACCOUNTS, 
  INITIAL_INSTALLMENTS, 
  INITIAL_SETTINGS 
} from './data/seedData';
import { 
  calculatePaymentSchedule, 
  generateAlerts, 
  projectMonthlyCashFlow 
} from './utils/paymentOptimizer';
import { UserDatabaseService } from './services/userDatabaseService';
import { formatCurrency } from './utils/currency';

// Subcomponents
import { Navbar } from './components/Navbar';
import { ExecutiveOverview } from './components/ExecutiveOverview';
import { PaymentOptimizerMatrix } from './components/PaymentOptimizerMatrix';
import { CycleGraceVisualizer } from './components/CycleGraceVisualizer';
import { InstallmentsCashFlowTracker } from './components/InstallmentsCashFlowTracker';
import { BankSyncModal } from './components/BankSyncModal';
import { AIAdvisorModal } from './components/AIAdvisorModal';
import { AlertsDrawer } from './components/AlertsDrawer';
import { AuthScreen } from './components/AuthScreen';
import { FamilySyncModal } from './components/FamilySyncModal';

import { 
  Sliders, 
  Calendar, 
  ShoppingBag, 
  Building2, 
  Plus, 
  RefreshCw, 
  ShieldCheck, 
  Trash2,
  Database,
  ArrowRightLeft,
  CheckCircle2,
  CreditCard,
  Wallet
} from 'lucide-react';

export default function App() {
  // Authentication & Dedicated Database State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    return UserDatabaseService.getActiveUser();
  });
  const [userDb, setUserDb] = useState<UserDedicatedDatabase | null>(null);
  const [isFamilySyncOpen, setIsFamilySyncOpen] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('Saved');

  // State: Accounts
  const [accounts, setAccounts] = useState<BillAccount[]>(INITIAL_ACCOUNTS);
  // State: Installments
  const [installments, setInstallments] = useState<InstallmentPlan[]>(INITIAL_INSTALLMENTS);
  // State: User settings
  const [settings, setSettings] = useState<UserSettings>(INITIAL_SETTINGS);

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

  // Load dedicated database when user logs in or switches
  const loadDedicatedUserDatabase = useCallback((user: UserProfile) => {
    try {
      const db = UserDatabaseService.loadUserDatabase(user.id);
      setUserDb(db);
      setAccounts(db.accounts || []);
      setInstallments(db.installments || []);
      if (db.settings) {
        setSettings(db.settings);
        setAllocatedCash(db.settings.allocatedCashForBills || 3500);
        setStrategy(db.settings.defaultStrategy || 'grace_float');
      }
      setPaidScheduleIds(new Set(db.paidScheduleIds || []));
      setScheduledScheduleIds(new Set(db.scheduledScheduleIds || []));
      setAlertThresholds(db.alertThresholds || [7, 3, 1]);
      setAutoSaveStatus('Loaded');
    } catch (err) {
      console.error('Failed to load user database:', err);
    }
  }, []);

  // Initial load effect
  useEffect(() => {
    if (currentUser) {
      loadDedicatedUserDatabase(currentUser);
    }
  }, [currentUser, loadDedicatedUserDatabase]);

  // Auto-save helper to ensure all user inputs are persisted automatically to dedicated DB
  const triggerAutoSave = useCallback((
    updatedAccounts: BillAccount[],
    updatedInstallments: InstallmentPlan[],
    updatedSettings: UserSettings,
    updatedPaid: Set<string>,
    updatedScheduled: Set<string>
  ) => {
    if (!currentUser) return;
    setAutoSaveStatus('Saving...');
    try {
      const dbToSave: UserDedicatedDatabase = {
        databaseId: currentUser.databaseId,
        userId: currentUser.id,
        userEmail: currentUser.email,
        lastUpdated: new Date().toISOString(),
        version: (userDb?.version || 1) + 1,
        accounts: updatedAccounts,
        installments: updatedInstallments,
        settings: updatedSettings,
        paidScheduleIds: Array.from(updatedPaid),
        scheduledScheduleIds: Array.from(updatedScheduled),
        alertThresholds,
      };
      UserDatabaseService.saveUserDatabase(dbToSave);
      setUserDb(dbToSave);
      setAutoSaveStatus(`Auto-saved at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    } catch (err) {
      console.error('Auto-save error:', err);
      setAutoSaveStatus('Local state active');
    }
  }, [currentUser, userDb, alertThresholds]);

  // Update dynamic alerts whenever accounts, installments, or currency changes
  useEffect(() => {
    if (accounts.length > 0) {
      const generated = generateAlerts(accounts, installments, settings.currency || 'MYR');
      setAlerts(generated);
    }
  }, [accounts, installments, settings.currency]);

  // Calculations
  const schedule = useMemo(
    () => calculatePaymentSchedule(accounts, strategy, allocatedCash, settings.paycheckDates),
    [accounts, strategy, allocatedCash, settings.paycheckDates]
  );

  const projections = useMemo(
    () => projectMonthlyCashFlow(accounts, installments, settings.monthlyIncome, 6),
    [accounts, installments, settings.monthlyIncome]
  );

  // User Authenticated Handler
  const handleUserAuthenticated = (user: UserProfile) => {
    setCurrentUser(user);
    loadDedicatedUserDatabase(user);
  };

  // Switch User Profile Handler
  const handleSwitchUser = (newUser: UserProfile) => {
    UserDatabaseService.setActiveUser(newUser.id);
    setCurrentUser(newUser);
    loadDedicatedUserDatabase(newUser);
  };

  // Logout Handler
  const handleLogout = () => {
    UserDatabaseService.logout();
    setCurrentUser(null);
    setUserDb(null);
  };

  // Database Updated from Family Sync
  const handleDatabaseUpdated = (updatedDb: UserDedicatedDatabase) => {
    setUserDb(updatedDb);
    setAccounts(updatedDb.accounts || []);
    setInstallments(updatedDb.installments || []);
    if (updatedDb.settings) {
      setSettings(updatedDb.settings);
      setAllocatedCash(updatedDb.settings.allocatedCashForBills || 3500);
      setStrategy(updatedDb.settings.defaultStrategy || 'grace_float');
    }
    setAutoSaveStatus('Synchronized');
  };

  // Sync all balances with Open Banking API simulation
  const handleSyncAll = async (provider = 'OpenBanking Sandbox') => {
    setIsSyncing(true);
    try {
      // Simulate live balance drift
      const drifted = accounts.map((acc) => {
        const drift = (Math.random() - 0.5) * 30;
        const newTotal = Math.max(acc.statementBalance, Math.round((acc.totalBalance + drift) * 100) / 100);
        return {
          ...acc,
          totalBalance: newTotal,
          lastSyncedAt: new Date().toISOString(),
          status: 'synced' as const,
        };
      });
      setAccounts(drifted);
      triggerAutoSave(drifted, installments, settings, paidScheduleIds, scheduledScheduleIds);
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Add new account
  const handleAddAccount = async (newAcc: Omit<BillAccount, 'id' | 'apiSynced' | 'lastSyncedAt' | 'status' | 'accountNumberMask'>) => {
    const created: BillAccount = {
      ...newAcc,
      id: `acc-${Date.now()}`,
      apiSynced: false,
      lastSyncedAt: new Date().toISOString(),
      status: 'active',
      accountNumberMask: `•••• ${Math.floor(1000 + Math.random() * 9000)}`,
      ownerName: currentUser ? `${currentUser.name} (${currentUser.familyRole})` : undefined,
      ownerRole: currentUser?.familyRole,
    };
    const nextAccounts = [...accounts, created];
    setAccounts(nextAccounts);
    triggerAutoSave(nextAccounts, installments, settings, paidScheduleIds, scheduledScheduleIds);
  };

  // Delete account
  const handleDeleteAccount = async (id: string) => {
    const nextAccounts = accounts.filter((a) => a.id !== id);
    const nextInstallments = installments.filter((i) => i.accountId !== id);
    setAccounts(nextAccounts);
    setInstallments(nextInstallments);
    triggerAutoSave(nextAccounts, nextInstallments, settings, paidScheduleIds, scheduledScheduleIds);
  };

  // Add new installment plan
  const handleAddInstallment = async (plan: Omit<InstallmentPlan, 'id'>) => {
    const created: InstallmentPlan = {
      ...plan,
      id: `inst-${Date.now()}`,
      ownerName: currentUser ? `${currentUser.name} (${currentUser.familyRole})` : undefined,
      ownerRole: currentUser?.familyRole,
    };
    const nextInstallments = [...installments, created];
    setInstallments(nextInstallments);
    triggerAutoSave(accounts, nextInstallments, settings, paidScheduleIds, scheduledScheduleIds);
  };

  // Delete installment plan
  const handleDeleteInstallment = async (id: string) => {
    const nextInstallments = installments.filter((i) => i.id !== id);
    setInstallments(nextInstallments);
    triggerAutoSave(accounts, nextInstallments, settings, paidScheduleIds, scheduledScheduleIds);
  };

  // Toggle paid / scheduled status for schedule items
  const handleToggleScheduleStatus = (scheduleId: string) => {
    let nextPaid = new Set(paidScheduleIds);
    let nextScheduled = new Set(scheduledScheduleIds);

    if (paidScheduleIds.has(scheduleId)) {
      nextPaid.delete(scheduleId);
    } else if (scheduledScheduleIds.has(scheduleId)) {
      nextScheduled.delete(scheduleId);
      nextPaid.add(scheduleId);
    } else {
      nextScheduled.add(scheduleId);
    }

    setPaidScheduleIds(nextPaid);
    setScheduledScheduleIds(nextScheduled);
    triggerAutoSave(accounts, installments, settings, nextPaid, nextScheduled);
  };

  // Mark single alert as read
  const handleMarkAlertRead = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  // Clear all alerts
  const handleClearAllAlerts = () => {
    setAlerts([]);
  };

  // Helper: Account icon selector
  const renderAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'credit_card':
        return <CreditCard className="w-4 h-4 text-white" />;
      case 'ewallet_pay_later':
        return <Wallet className="w-4 h-4 text-white" />;
      case 'bank_account':
      default:
        return <Building2 className="w-4 h-4 text-white" />;
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'credit_card':
        return 'Credit Card';
      case 'ewallet_pay_later':
        return 'E-Wallet / BNPL';
      case 'bank_account':
        return 'Bank Account';
      default:
        return type;
    }
  };

  // If no user is authenticated, mandate registration or sign-in
  if (!currentUser) {
    return <AuthScreen onAuthenticated={handleUserAuthenticated} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white pb-16">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        alerts={alerts}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onOpenConnectBank={() => setIsConnectBankOpen(true)}
        onOpenAIAdvisor={() => setIsAIAdvisorOpen(true)}
        onOpenFamilySync={() => setIsFamilySyncOpen(true)}
        onLogout={handleLogout}
        onSyncAll={() => handleSyncAll()}
        isSyncing={isSyncing}
        lastSyncedTime={lastSyncedTime}
      />

      {/* Dedicated Database Status Banner */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">
              Dedicated Database: <code className="font-mono text-indigo-300 font-semibold">{currentUser.databaseId}</code>
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-400 hidden sm:inline">
              Assigned to: <strong className="text-white">{currentUser.name}</strong> ({currentUser.familyRole})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{autoSaveStatus}</span>
            </span>
            <button
              onClick={() => setIsFamilySyncOpen(true)}
              className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer flex items-center gap-1 hover:underline text-[11px]"
            >
              <ArrowRightLeft className="w-3 h-3" />
              <span>Sync with Family</span>
            </button>
          </div>
        </div>
      </div>

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
            onStrategyChange={(strat) => {
              setStrategy(strat);
              const updated = { ...settings, defaultStrategy: strat };
              setSettings(updated);
              triggerAutoSave(accounts, installments, updated, paidScheduleIds, scheduledScheduleIds);
            }}
            allocatedCash={allocatedCash}
            onAllocatedCashChange={(val) => {
              setAllocatedCash(val);
              const updated = { ...settings, allocatedCashForBills: val };
              setSettings(updated);
              triggerAutoSave(accounts, installments, updated, paidScheduleIds, scheduledScheduleIds);
            }}
            paidScheduleIds={paidScheduleIds}
            scheduledScheduleIds={scheduledScheduleIds}
            onToggleStatus={handleToggleScheduleStatus}
            onOpenAIAdvisor={() => setIsAIAdvisorOpen(true)}
          />
        )}

        {/* Tab 2: Billing Cycle & Grace Float Matrix */}
        {activeTab === 'cycle_matrix' && (
          <CycleGraceVisualizer
            accounts={accounts}
            currency={settings.currency || 'MYR'}
          />
        )}

        {/* Tab 3: Multi-Month Installments Tracker */}
        {activeTab === 'installments' && (
          <InstallmentsCashFlowTracker
            installments={installments}
            accounts={accounts}
            projections={projections}
            onAddInstallment={handleAddInstallment}
            onDeleteInstallment={handleDeleteInstallment}
            currency={settings.currency || 'MYR'}
          />
        )}

        {/* Tab 4: Connected Accounts Manager */}
        {activeTab === 'accounts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Linked Accounts Hub</h2>
                <p className="text-xs text-slate-400">
                  Manage credit cards, e-wallets, and banking relationships stored in your dedicated database.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFamilySyncOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/40 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Sync Partner Accounts</span>
                </button>
                <button
                  onClick={() => setIsConnectBankOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Link New Account</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((acc) => {
                const utilRatio = Math.round((acc.statementBalance / (acc.creditLimit || 1)) * 100);

                return (
                  <div
                    key={acc.id}
                    className="p-4 rounded-2xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all space-y-3 relative group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-md"
                          style={{ backgroundColor: acc.color }}
                        >
                          {renderAccountTypeIcon(acc.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-sm">{acc.name}</span>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                              style={{
                                backgroundColor: `${acc.color}20`,
                                color: acc.color,
                              }}
                            >
                              {getAccountTypeLabel(acc.type)}
                            </span>
                            {acc.ownerName && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-slate-800 border border-slate-700 text-slate-300">
                                {acc.ownerName}
                              </span>
                            )}
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
                        <div className="font-bold text-white">{formatCurrency(acc.totalBalance, settings.currency)}</div>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400">Statement Due</span>
                        <div className="font-bold text-amber-400">{formatCurrency(acc.statementBalance, settings.currency)}</div>
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
                        <div className="font-medium text-rose-400">{formatCurrency(acc.lateFee, settings.currency)}</div>
                      </div>
                    </div>

                    {/* Utilization mini-bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Limit: {formatCurrency(acc.creditLimit, settings.currency)}</span>
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
        currency={settings.currency || 'MYR'}
      />

      <AIAdvisorModal
        isOpen={isAIAdvisorOpen}
        onClose={() => setIsAIAdvisorOpen(false)}
        accounts={accounts}
        strategy={strategy}
        liquidCash={allocatedCash}
        currency={settings.currency || 'MYR'}
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

      {/* Family Synchronization & Export/Import Modal */}
      {userDb && (
        <FamilySyncModal
          isOpen={isFamilySyncOpen}
          onClose={() => setIsFamilySyncOpen(false)}
          currentUser={currentUser}
          currentDb={userDb}
          onDatabaseUpdated={handleDatabaseUpdated}
          onSwitchUser={handleSwitchUser}
        />
      )}
    </div>
  );
}
