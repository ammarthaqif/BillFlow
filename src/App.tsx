import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BillAccount, 
  InstallmentPlan, 
  UserSettings, 
  PaymentStrategyType, 
  CustomAlert,
  UserProfile,
  UserDedicatedDatabase,
  ExpenseItem,
  ExpenseCategory,
  SettlementMethod,
  StandingInstruction,
  BankScheduledTransaction,
  ProPaymentRecord,
  QuickPayTemplate
} from './types';
import { 
  INITIAL_ACCOUNTS, 
  INITIAL_INSTALLMENTS, 
  INITIAL_SETTINGS,
  INITIAL_EXPENSES,
  INITIAL_STANDING_INSTRUCTIONS,
  INITIAL_BANK_SCHEDULED_TRANSACTIONS,
  INITIAL_QUICK_PAY_TEMPLATES
} from './data/seedData';
import { 
  calculatePaymentSchedule, 
  generateAlerts, 
  projectMonthlyCashFlow 
} from './utils/paymentOptimizer';
import { UserDatabaseService } from './services/userDatabaseService';
import { formatCurrency } from './utils/currency';
import { renderAccountIcon, getAccountTypeLabel, calculateInterestSavedEstimate } from './utils/accountUtils';
import { processDueRecurringExpenses, forceGenerateNextRecurringMonth } from './utils/recurringExpenses';

// Subcomponents
import { Navbar } from './components/Navbar';
import { ExecutiveOverview } from './components/ExecutiveOverview';
import { DailyHub } from './components/DailyHub';
import { StrategyCashFlowHub } from './components/StrategyCashFlowHub';
import { UniversalQuickAddModal } from './components/UniversalQuickAddModal';
import { PaymentOptimizerMatrix } from './components/PaymentOptimizerMatrix';
import { CycleGraceVisualizer } from './components/CycleGraceVisualizer';
import { InstallmentsCashFlowTracker } from './components/InstallmentsCashFlowTracker';
import { BankSyncModal } from './components/BankSyncModal';
import { AIAdvisorModal } from './components/AIAdvisorModal';
import { AlertsDrawer } from './components/AlertsDrawer';
import { AuthScreen } from './components/AuthScreen';
import { FamilySyncModal } from './components/FamilySyncModal';
import { ExpensesHub } from './components/ExpensesHub';
import { StandingInstructionsManager } from './components/StandingInstructionsManager';
import { ReceiptCaptureModal } from './components/ReceiptCaptureModal';
import { UpgradeToProModal } from './components/UpgradeToProModal';
import { IncomeSettingsModal } from './components/IncomeSettingsModal';
import { BankSettlementAdvisorModal } from './components/BankSettlementAdvisorModal';
import { UpdateBankBalanceModal } from './components/UpdateBankBalanceModal';
import { AccountTransactionsModal } from './components/AccountTransactionsModal';
import { EditAccountModal } from './components/EditAccountModal';
import { ExpenseModal } from './components/ExpenseModal';
import { QuickPayExecuteModal } from './components/QuickPayExecuteModal';
import { QuickPayManageModal } from './components/QuickPayManageModal';
import { DatabaseResetModal } from './components/DatabaseResetModal';

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
  Wallet,
  Receipt,
  Zap,
  CalendarClock,
  Crown,
  Landmark,
  Edit3,
  Layers,
  Sun,
  RotateCcw,
  BarChart3,
  ChevronDown,
  ChevronUp
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
  // State: Expenses & Purchases
  const [expenses, setExpenses] = useState<ExpenseItem[]>(INITIAL_EXPENSES);
  // State: Standing Instructions & Scheduled Payments
  const [standingInstructions, setStandingInstructions] = useState<StandingInstruction[]>(INITIAL_STANDING_INSTRUCTIONS);
  // State: Bank Scheduled Transactions
  const [bankScheduledTransactions, setBankScheduledTransactions] = useState<BankScheduledTransaction[]>(INITIAL_BANK_SCHEDULED_TRANSACTIONS);
  // State: User settings
  const [settings, setSettings] = useState<UserSettings>(INITIAL_SETTINGS);

  // Active view tab (default to 'today' for daily engagement & zero friction)
  const [activeTab, setActiveTab] = useState<'today' | 'overview' | 'strategy' | 'expenses' | 'accounts' | 'optimizer' | 'cycle_matrix' | 'installments' | 'rewards_balancer' | 'standing_instructions'>('today');
  const [isOverviewExpandedOnToday, setIsOverviewExpandedOnToday] = useState(false);
  // Accounts sub-tab: 'cards' or 'standing_instructions'
  const [accountsSubTab, setAccountsSubTab] = useState<'cards' | 'standing_instructions'>('cards');

  // Strategy & Simulation Cash
  const [strategy, setStrategy] = useState<PaymentStrategyType>('grace_float');
  const [allocatedCash, setAllocatedCash] = useState<number>(3500);

  // Paid & Scheduled state sets
  const [paidScheduleIds, setPaidScheduleIds] = useState<Set<string>>(new Set());
  const [scheduledScheduleIds, setScheduledScheduleIds] = useState<Set<string>>(new Set());

  // Alerts
  const [alerts, setAlerts] = useState<CustomAlert[]>([]);
  const [alertThresholds, setAlertThresholds] = useState<number[]>([7, 3, 1]);

  // Universal Quick Add Modal
  const [isUniversalQuickAddOpen, setIsUniversalQuickAddOpen] = useState(false);
  const [universalQuickAddInitialTab, setUniversalQuickAddInitialTab] = useState<'expense' | 'bank_balance' | 'account' | 'recurring'>('expense');

  // Modals
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isConnectBankOpen, setIsConnectBankOpen] = useState(false);
  const [isAIAdvisorOpen, setIsAIAdvisorOpen] = useState(false);
  const [isReceiptCaptureOpen, setIsReceiptCaptureOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string>('');
  const [isIncomeSettingsOpen, setIsIncomeSettingsOpen] = useState(false);
  const [incomeSettingsInitialTab, setIncomeSettingsInitialTab] = useState<'salary' | 'csv' | 'backup'>('salary');
  const [isBankAdvisorOpen, setIsBankAdvisorOpen] = useState(false);
  const [advisorTargetAccountId, setAdvisorTargetAccountId] = useState<string | undefined>(undefined);

  // Account management & transaction modals state
  const [isUpdateBankBalanceOpen, setIsUpdateBankBalanceOpen] = useState(false);
  const [selectedBankAccountIdForUpdate, setSelectedBankAccountIdForUpdate] = useState<string | undefined>(undefined);
  const [isAccountTransactionsOpen, setIsAccountTransactionsOpen] = useState(false);
  const [selectedAccountForTransactions, setSelectedAccountForTransactions] = useState<BillAccount | null>(null);
  const [isEditAccountOpen, setIsEditAccountOpen] = useState(false);
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<BillAccount | null>(null);
  const [isStandaloneExpenseModalOpen, setIsStandaloneExpenseModalOpen] = useState(false);
  const [standaloneExpenseInitialAccount, setStandaloneExpenseInitialAccount] = useState<string | undefined>(undefined);
  const [standaloneEditingExpense, setStandaloneEditingExpense] = useState<ExpenseItem | null>(null);

  // Quick Pay Templates state (recurring non-automated bills)
  const [quickPayTemplates, setQuickPayTemplates] = useState<QuickPayTemplate[]>([]);
  const [isQuickPayExecuteOpen, setIsQuickPayExecuteOpen] = useState(false);
  const [selectedQuickPayTemplate, setSelectedQuickPayTemplate] = useState<QuickPayTemplate | null>(null);
  const [isQuickPayManageOpen, setIsQuickPayManageOpen] = useState(false);

  // Database Reset Modal state
  const [isDatabaseResetOpen, setIsDatabaseResetOpen] = useState(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('Just now');

  // Load dedicated database when user logs in or switches
  const loadDedicatedUserDatabase = useCallback((user: UserProfile) => {
    try {
      const db = UserDatabaseService.loadUserDatabase(user.id);
      const loadedAccounts = db.accounts || [];
      const rawExpenses = db.expenses && db.expenses.length > 0 ? db.expenses : INITIAL_EXPENSES;

      // Check and automatically generate monthly recurring expenses due today or past-due
      const { updatedExpenses, updatedAccounts, generatedCount } = processDueRecurringExpenses(rawExpenses, loadedAccounts);

      setUserDb(db);
      setAccounts(updatedAccounts);
      setInstallments(db.installments || []);
      setExpenses(updatedExpenses);
      setStandingInstructions(db.standingInstructions && db.standingInstructions.length > 0 ? db.standingInstructions : INITIAL_STANDING_INSTRUCTIONS);
      setBankScheduledTransactions(
        db.bankScheduledTransactions && db.bankScheduledTransactions.length > 0
          ? db.bankScheduledTransactions
          : INITIAL_BANK_SCHEDULED_TRANSACTIONS
      );
      if (db?.settings) {
        setSettings(db.settings);
        setAllocatedCash(db.settings.allocatedCashForBills ?? 3500);
        setStrategy(db.settings.defaultStrategy || 'grace_float');
      } else {
        setSettings(INITIAL_SETTINGS);
        setAllocatedCash(3500);
        setStrategy('grace_float');
      }
      setPaidScheduleIds(new Set(db.paidScheduleIds || []));
      setScheduledScheduleIds(new Set(db.scheduledScheduleIds || []));
      setAlertThresholds(db.alertThresholds || [7, 3, 1]);
      setQuickPayTemplates(
        db.quickPayTemplates && Array.isArray(db.quickPayTemplates)
          ? db.quickPayTemplates
          : INITIAL_QUICK_PAY_TEMPLATES
      );
      setAutoSaveStatus(generatedCount > 0 ? `Auto-generated ${generatedCount} bills` : 'Loaded');

      if (generatedCount > 0) {
        UserDatabaseService.saveUserDatabase({
          ...db,
          accounts: updatedAccounts,
          expenses: updatedExpenses,
        });
      }
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
    updatedScheduled: Set<string>,
    updatedExpenses?: ExpenseItem[],
    updatedStandingInstructions?: StandingInstruction[],
    updatedBankScheduledTransactions?: BankScheduledTransaction[],
    updatedQuickPayTemplates?: QuickPayTemplate[]
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
        expenses: updatedExpenses || expenses,
        standingInstructions: updatedStandingInstructions || standingInstructions,
        bankScheduledTransactions: updatedBankScheduledTransactions || bankScheduledTransactions,
        quickPayTemplates: updatedQuickPayTemplates || quickPayTemplates,
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
  }, [currentUser, userDb, alertThresholds, expenses, standingInstructions, bankScheduledTransactions, quickPayTemplates]);

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
    if (currentUser) {
      const check = UserDatabaseService.canSwitchToUser(currentUser, newUser.id);
      if (!check.allowed) {
        alert(check.reason || 'Switching to this user profile is not permitted.');
        return;
      }
    }
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

  // Database Updated from Family Sync or Fresh Reset
  const handleDatabaseUpdated = (updatedDb: UserDedicatedDatabase) => {
    setUserDb(updatedDb);
    setAccounts(updatedDb.accounts || []);
    setInstallments(updatedDb.installments || []);
    setExpenses(updatedDb.expenses || []);
    setStandingInstructions(updatedDb.standingInstructions || []);
    setBankScheduledTransactions(updatedDb.bankScheduledTransactions || []);
    setQuickPayTemplates(
      updatedDb.quickPayTemplates && Array.isArray(updatedDb.quickPayTemplates)
        ? updatedDb.quickPayTemplates
        : []
    );
    setPaidScheduleIds(new Set(updatedDb.paidScheduleIds || []));
    setScheduledScheduleIds(new Set(updatedDb.scheduledScheduleIds || []));
    if (updatedDb?.settings) {
      setSettings(updatedDb.settings);
      setAllocatedCash(updatedDb.settings.allocatedCashForBills ?? 3500);
      setStrategy(updatedDb.settings.defaultStrategy || 'grace_float');
    }
    setAutoSaveStatus('Synchronized');
  };

  const handleDatabaseReset = (freshDb: UserDedicatedDatabase) => {
    handleDatabaseUpdated(freshDb);
    setAutoSaveStatus('Database Reset to Fresh Restart');
  };

  const handleFactoryReset = () => {
    handleLogout();
  };

  // Quick Pay Template Handlers
  const handleSaveQuickPayTemplate = (template: QuickPayTemplate) => {
    if (!currentUser) return;
    const updated = UserDatabaseService.saveQuickPayTemplate(currentUser.id, template);
    const safeUpdated = Array.isArray(updated) ? updated : [];
    setQuickPayTemplates(safeUpdated);
    triggerAutoSave(
      accounts,
      installments,
      settings,
      paidScheduleIds,
      scheduledScheduleIds,
      expenses,
      standingInstructions,
      bankScheduledTransactions,
      safeUpdated
    );
  };

  const handleDeleteQuickPayTemplate = (templateId: string) => {
    if (!currentUser) return;
    const updated = UserDatabaseService.deleteQuickPayTemplate(currentUser.id, templateId);
    const safeUpdated = Array.isArray(updated) ? updated : [];
    setQuickPayTemplates(safeUpdated);
    triggerAutoSave(
      accounts,
      installments,
      settings,
      paidScheduleIds,
      scheduledScheduleIds,
      expenses,
      standingInstructions,
      bankScheduledTransactions,
      safeUpdated
    );
  };

  const handleExecuteQuickPaySettlement = (
    template: QuickPayTemplate,
    settlementDetails: {
      sourceAccountId?: string;
      amount?: number;
      amountPaid?: number;
      settlementMethod?: SettlementMethod;
      referenceNumber?: string;
      referenceCode?: string;
      date?: string;
      notes?: string;
    }
  ) => {
    if (!currentUser) return;

    // 1. Record template usage
    const updatedTemplates = UserDatabaseService.recordQuickPayUsage(currentUser.id, template.id);
    const safeTemplates = Array.isArray(updatedTemplates) ? updatedTemplates : quickPayTemplates;
    setQuickPayTemplates(safeTemplates);

    // 2. Determine deduction amount & funding account
    const amountToDeduct = settlementDetails.amount ?? settlementDetails.amountPaid ?? template.defaultAmount ?? 0;
    const fundingAccountId = settlementDetails.sourceAccountId || template.sourceAccountId || (accounts.find((a) => a.type === 'bank_account')?.id);
    const sourceAcc = accounts.find((a) => a.id === fundingAccountId);
    const refCode = settlementDetails.referenceNumber || settlementDetails.referenceCode || `QP-${Date.now().toString(36).toUpperCase()}`;

    // 3. Create settled expense item in ledger
    const newExpense: ExpenseItem = {
      id: `exp-qpay-${Date.now().toString(36)}`,
      accountId: fundingAccountId || (accounts[0]?.id || 'direct_payment'),
      accountName: sourceAcc ? sourceAcc.name : (template.sourceAccountName || 'Direct Payment'),
      accountType: sourceAcc ? sourceAcc.type : 'bank_account',
      title: `${template.title} (${template.beneficiary})`,
      category: template.category,
      amount: amountToDeduct,
      date: settlementDetails.date || new Date().toISOString().split('T')[0],
      status: 'settled',
      settledAt: new Date().toISOString(),
      settlementMethod: settlementDetails.settlementMethod || template.settlementMethod || 'jompay',
      settlementReference: refCode,
      settledFromAccountId: fundingAccountId,
      paymentMode: template.paymentMode || 'cash',
      notes: settlementDetails.notes || `Quick Pay: ${template.beneficiaryAccountOrRef} • Ref: ${refCode}`,
      ownerName: currentUser.name,
      ownerRole: currentUser.familyRole,
    };

    const nextExpenses = [newExpense, ...expenses];
    setExpenses(nextExpenses);

    // 4. Update account balances
    let nextAccounts = [...accounts];
    if (fundingAccountId) {
      const targetAccIndex = nextAccounts.findIndex((a) => a.id === fundingAccountId);
      if (targetAccIndex !== -1) {
        const acc = nextAccounts[targetAccIndex];
        if (acc.type === 'bank_account') {
          nextAccounts[targetAccIndex] = {
            ...acc,
            totalBalance: Math.max(0, Math.round(((acc.totalBalance || 0) - amountToDeduct) * 100) / 100),
            lastSyncedAt: new Date().toISOString(),
          };
        }
        setAccounts(nextAccounts);
      }
    }

    triggerAutoSave(
      nextAccounts,
      installments,
      settings,
      paidScheduleIds,
      scheduledScheduleIds,
      nextExpenses,
      standingInstructions,
      bankScheduledTransactions,
      safeTemplates
    );
  };

  // Update Income Settings Handler
  const handleSaveIncomeSettings = (updatedSettings: UserSettings) => {
    setSettings(updatedSettings);
    triggerAutoSave(
      accounts,
      installments,
      updatedSettings,
      paidScheduleIds,
      scheduledScheduleIds,
      expenses,
      standingInstructions,
      bankScheduledTransactions
    );
  };

  // Schedule a new Bank Transaction
  const handleScheduleBankTransaction = (txData: Omit<BankScheduledTransaction, 'id' | 'createdAt'>) => {
    const newTx: BankScheduledTransaction = {
      ...txData,
      id: `btx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const nextTxs = [newTx, ...bankScheduledTransactions];
    setBankScheduledTransactions(nextTxs);

    const nextScheduled = new Set(scheduledScheduleIds);
    if (newTx.targetAccountId) {
      nextScheduled.add(newTx.targetAccountId);
      setScheduledScheduleIds(nextScheduled);
    }
    triggerAutoSave(
      accounts,
      installments,
      settings,
      paidScheduleIds,
      nextScheduled,
      expenses,
      standingInstructions,
      nextTxs
    );
  };

  // Execute a scheduled bank transaction
  const handleExecuteBankTransaction = (txId: string) => {
    const tx = bankScheduledTransactions.find((t) => t.id === txId);
    if (!tx) return;
    const nextAccounts = [...accounts];

    // Deduct from funding bank account
    const bankIdx = nextAccounts.findIndex((a) => a.id === tx.sourceBankAccountId);
    if (bankIdx !== -1) {
      const bank = nextAccounts[bankIdx];
      nextAccounts[bankIdx] = {
        ...bank,
        totalBalance: Math.max(0, Math.round((bank.totalBalance - tx.amount) * 100) / 100),
        lastSyncedAt: new Date().toISOString(),
      };
    }

    // Deduct from target statement balance if credit card or BNPL
    if (tx.targetAccountId) {
      const targetIdx = nextAccounts.findIndex((a) => a.id === tx.targetAccountId);
      if (targetIdx !== -1) {
        const target = nextAccounts[targetIdx];
        const newStatement = Math.max(0, Math.round((target.statementBalance - tx.amount) * 100) / 100);
        const newTotal = Math.max(0, Math.round((target.totalBalance - tx.amount) * 100) / 100);
        nextAccounts[targetIdx] = {
          ...target,
          statementBalance: newStatement,
          totalBalance: newTotal,
          status: newStatement === 0 ? 'settled' : target.status,
          lastSyncedAt: new Date().toISOString(),
        };
      }
    }

    const nextTxs = bankScheduledTransactions.map((t) => {
      if (t.id === txId) {
        return {
          ...t,
          status: 'executed' as const,
          executedAt: new Date().toISOString(),
        };
      }
      return t;
    });

    setAccounts(nextAccounts);
    setBankScheduledTransactions(nextTxs);
    triggerAutoSave(
      nextAccounts,
      installments,
      settings,
      paidScheduleIds,
      scheduledScheduleIds,
      expenses,
      standingInstructions,
      nextTxs
    );
  };

  // Cancel scheduled bank transaction
  const handleCancelBankTransaction = (txId: string) => {
    const nextTxs = bankScheduledTransactions.map((t) => {
      if (t.id === txId) {
        return { ...t, status: 'cancelled' as const };
      }
      return t;
    });
    setBankScheduledTransactions(nextTxs);
    triggerAutoSave(
      accounts,
      installments,
      settings,
      paidScheduleIds,
      scheduledScheduleIds,
      expenses,
      standingInstructions,
      nextTxs
    );
  };

  // Direct Immediate statement settlement from bank
  const handleImmediateSettleAccount = (accountId: string, amount: number, sourceBankId: string) => {
    const nextAccounts = [...accounts];
    const bankIdx = nextAccounts.findIndex((a) => a.id === sourceBankId);
    const targetIdx = nextAccounts.findIndex((a) => a.id === accountId);

    if (bankIdx !== -1) {
      const bank = nextAccounts[bankIdx];
      nextAccounts[bankIdx] = {
        ...bank,
        totalBalance: Math.max(0, Math.round((bank.totalBalance - amount) * 100) / 100),
        lastSyncedAt: new Date().toISOString(),
      };
    }

    if (targetIdx !== -1) {
      const target = nextAccounts[targetIdx];
      const newStatement = Math.max(0, Math.round((target.statementBalance - amount) * 100) / 100);
      const newTotal = Math.max(0, Math.round((target.totalBalance - amount) * 100) / 100);
      nextAccounts[targetIdx] = {
        ...target,
        statementBalance: newStatement,
        totalBalance: newTotal,
        status: newStatement === 0 ? 'settled' : target.status,
        lastSyncedAt: new Date().toISOString(),
      };
    }

    const newTx: BankScheduledTransaction = {
      id: `btx_imm_${Date.now()}`,
      sourceBankAccountId: sourceBankId,
      sourceBankAccountName: nextAccounts[bankIdx]?.name || 'Bank Account',
      targetAccountId: accountId,
      targetAccountName: nextAccounts[targetIdx]?.name || 'Card / BNPL Account',
      type: nextAccounts[targetIdx]?.type === 'ewallet_pay_later' ? 'settlement_bnpl' : 'settlement_credit_card',
      title: `Statement Settlement: ${nextAccounts[targetIdx]?.name || 'Card'}`,
      amount,
      scheduledDate: new Date().toISOString().split('T')[0],
      status: 'executed',
      executedAt: new Date().toISOString(),
      notes: 'Immediate statement settlement executed directly via bank balance',
      referenceNumber: `FPX-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };

    const nextTxs = [newTx, ...bankScheduledTransactions];
    setAccounts(nextAccounts);
    setBankScheduledTransactions(nextTxs);
    triggerAutoSave(
      nextAccounts,
      installments,
      settings,
      paidScheduleIds,
      scheduledScheduleIds,
      expenses,
      standingInstructions,
      nextTxs
    );
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

  // Add new account with Free Tier limit check
  const handleAddAccount = async (newAcc: Omit<BillAccount, 'id' | 'apiSynced' | 'lastSyncedAt' | 'status' | 'accountNumberMask'>) => {
    if (currentUser?.tier === 'free' && accounts.length >= (currentUser.tierLimits?.maxAccounts || 3)) {
      setUpgradeReason(`Free Tier Limit: You have reached the maximum of ${currentUser.tierLimits?.maxAccounts || 3} linked accounts. Upgrade to Pro for unlimited accounts.`);
      setIsUpgradeModalOpen(true);
      return;
    }
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

  // Upgrade to Pro handler upon verified payment transaction
  const handleUpgradeToPro = (paymentRecord: ProPaymentRecord) => {
    if (!currentUser) return;
    try {
      const updated = UserDatabaseService.upgradeToPro(currentUser.id, paymentRecord);
      if (updated) {
        setCurrentUser(updated);
        setAutoSaveStatus('Upgraded to Pro!');
      }
    } catch (err: any) {
      alert(err.message || 'Upgrade to Pro failed');
    }
  };

  // Cancel or Downgrade subscription handler
  const handleCancelSubscription = () => {
    if (!currentUser) return;
    const updated = UserDatabaseService.cancelProSubscription(currentUser.id);
    if (updated) {
      setCurrentUser(updated);
      setAutoSaveStatus('Reverted to Free Tier');
    }
  };

  // Standing Instructions & Scheduled Payment handlers
  const handleAddStandingInstruction = (siData: Omit<StandingInstruction, 'id' | 'createdAt'>) => {
    if (currentUser?.tier === 'free' && standingInstructions.length >= (currentUser.tierLimits?.maxStandingInstructions || 3)) {
      setUpgradeReason(`Free Tier Limit: You have reached the maximum of ${currentUser.tierLimits?.maxStandingInstructions || 3} standing instructions. Upgrade to Pro for unlimited recurring payments.`);
      setIsUpgradeModalOpen(true);
      return;
    }
    const created: StandingInstruction = {
      ...siData,
      id: `si-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const nextSI = [...standingInstructions, created];
    setStandingInstructions(nextSI);
    triggerAutoSave(accounts, installments, settings, paidScheduleIds, scheduledScheduleIds, expenses, nextSI);
  };

  const handleUpdateStandingInstruction = (updatedSI: StandingInstruction) => {
    const nextSI = standingInstructions.map((si) => si.id === updatedSI.id ? updatedSI : si);
    setStandingInstructions(nextSI);
    triggerAutoSave(accounts, installments, settings, paidScheduleIds, scheduledScheduleIds, expenses, nextSI);
  };

  const handleDeleteStandingInstruction = (id: string) => {
    const nextSI = standingInstructions.filter((si) => si.id !== id);
    setStandingInstructions(nextSI);
    triggerAutoSave(accounts, installments, settings, paidScheduleIds, scheduledScheduleIds, expenses, nextSI);
  };

  const handleExecuteStandingInstructionNow = (si: StandingInstruction) => {
    const sourceAcc = accounts.find((a) => a.id === si.sourceAccountId);
    const newExpense: ExpenseItem = {
      id: `exp-si-${Date.now()}`,
      accountId: si.sourceAccountId,
      accountName: si.sourceAccountName,
      accountType: sourceAcc?.type || 'bank_account',
      title: si.title,
      category: si.category,
      amount: si.amount,
      date: new Date().toISOString().split('T')[0],
      status: 'settled',
      paymentMode: si.method === 'auto_card_charge' ? 'credit_card' : 'cash',
      settlementMethod: 'instant_fpx',
      settledAt: new Date().toISOString(),
      notes: `Automated execution: ${si.title} (${si.frequency})`,
      merchant: si.billerOrRecipient,
      ownerName: currentUser ? `${currentUser.name} (${currentUser.familyRole})` : undefined,
      ownerRole: currentUser?.familyRole,
    };

    const nextDate = new Date(si.nextExecutionDate);
    if (si.frequency === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (si.frequency === 'quarterly') {
      nextDate.setMonth(nextDate.getMonth() + 3);
    } else if (si.frequency === 'yearly') {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }

    const updatedSI: StandingInstruction = {
      ...si,
      lastExecutedAt: new Date().toISOString(),
      nextExecutionDate: nextDate.toISOString().split('T')[0],
    };

    const nextSI = standingInstructions.map((item) => item.id === si.id ? updatedSI : item);
    const nextExpenses = [newExpense, ...expenses];

    const nextAccounts = accounts.map((acc) => {
      if (acc.id === si.sourceAccountId && acc.type === 'bank_account') {
        return {
          ...acc,
          totalBalance: Math.max(0, Math.round((acc.totalBalance - si.amount) * 100) / 100),
          lastSyncedAt: new Date().toISOString(),
        };
      }
      return acc;
    });

    setStandingInstructions(nextSI);
    setExpenses(nextExpenses);
    setAccounts(nextAccounts);
    triggerAutoSave(nextAccounts, installments, settings, paidScheduleIds, scheduledScheduleIds, nextExpenses, nextSI);
  };

  // Receipt expense added from OCR
  const handleReceiptExpenseAdded = (
    newExpenseData: Omit<ExpenseItem, 'id'>, 
    installmentData?: Omit<InstallmentPlan, 'id'>
  ) => {
    if (currentUser) {
      UserDatabaseService.incrementReceiptUsage(currentUser.id);
      const updatedUser = UserDatabaseService.getActiveUser();
      if (updatedUser) setCurrentUser(updatedUser);
    }
    handleAddExpense(
      newExpenseData, 
      undefined, 
      installmentData ? {
        tenure: installmentData.totalTenure,
        monthlyAmount: installmentData.monthlyAmount,
        interestRate: installmentData.interestRate
      } : undefined
    );
  };

  // Delete account
  const handleDeleteAccount = async (id: string) => {
    const nextAccounts = accounts.filter((a) => a.id !== id);
    const nextInstallments = installments.filter((i) => i.accountId !== id);
    setAccounts(nextAccounts);
    setInstallments(nextInstallments);
    triggerAutoSave(nextAccounts, nextInstallments, settings, paidScheduleIds, scheduledScheduleIds, expenses, standingInstructions, bankScheduledTransactions);
  };

  // Update existing account details
  const handleUpdateAccount = (updatedAccount: BillAccount) => {
    const nextAccounts = accounts.map((a) => (a.id === updatedAccount.id ? updatedAccount : a));
    setAccounts(nextAccounts);
    triggerAutoSave(nextAccounts, installments, settings, paidScheduleIds, scheduledScheduleIds, expenses, standingInstructions, bankScheduledTransactions);
    setAutoSaveStatus(`Updated ${updatedAccount.name}`);
  };

  // Update Bank Account balance directly
  const handleUpdateBankBalance = (accountId: string, newBalance: number, details?: Partial<BillAccount>) => {
    const nextAccounts = accounts.map((a) => {
      if (a.id === accountId) {
        return {
          ...a,
          ...details,
          totalBalance: Math.max(0, Math.round(newBalance * 100) / 100),
          lastSyncedAt: new Date().toISOString(),
        };
      }
      return a;
    });
    setAccounts(nextAccounts);
    triggerAutoSave(nextAccounts, installments, settings, paidScheduleIds, scheduledScheduleIds, expenses, standingInstructions, bankScheduledTransactions);
    setAutoSaveStatus(`Bank balance updated to ${formatCurrency(newBalance, settings.currency)}`);
  };

  // Sync statement balance from unsettled transactions for a credit card or BNPL
  const handleSyncAccountBalanceFromTransactions = (accountId: string) => {
    const unsettledSum = expenses
      .filter((e) => e.accountId === accountId && e.status !== 'settled')
      .reduce((sum, e) => sum + e.amount, 0);

    const nextAccounts = accounts.map((a) => {
      if (a.id === accountId) {
        const rounded = Math.round(unsettledSum * 100) / 100;
        return {
          ...a,
          statementBalance: rounded,
          totalBalance: Math.max(a.totalBalance, rounded),
          lastSyncedAt: new Date().toISOString(),
        };
      }
      return a;
    });
    setAccounts(nextAccounts);
    triggerAutoSave(nextAccounts, installments, settings, paidScheduleIds, scheduledScheduleIds, expenses, standingInstructions, bankScheduledTransactions);
    setAutoSaveStatus(`Reconciled statement balance to ${formatCurrency(unsettledSum, settings.currency)}`);
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

  // Add new expense / purchase
  const handleAddExpense = (
    expenseData: Omit<ExpenseItem, 'id'>,
    immediateSettle?: { method: SettlementMethod; sourceAccountId?: string },
    installmentSplit?: { tenure: number; monthlyAmount: number; interestRate?: number }
  ) => {
    const newId = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const createdExpense: ExpenseItem = {
      ...expenseData,
      id: newId,
    };

    let nextAccounts = [...accounts];
    let nextInstallments = [...installments];
    const chargedAccIndex = nextAccounts.findIndex((a) => a.id === createdExpense.accountId);

    // If multi-month installment plan was chosen
    if (installmentSplit && installmentSplit.tenure > 1) {
      const instId = `inst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      createdExpense.linkedInstallmentId = instId;
      createdExpense.splitMonths = installmentSplit.tenure;
      createdExpense.monthlySplitAmount = installmentSplit.monthlyAmount;
      createdExpense.splitFeeRate = installmentSplit.interestRate;
      createdExpense.repaymentStructure = 'split_months';

      const nextBilling = new Date();
      nextBilling.setDate(nextBilling.getDate() + 30);

      const newInstallmentItem: InstallmentPlan = {
        id: instId,
        accountId: createdExpense.accountId,
        accountName: createdExpense.accountName,
        title: `${createdExpense.title}${createdExpense.merchant ? ' (' + createdExpense.merchant + ')' : ''}`,
        totalAmount: createdExpense.amount,
        monthlyAmount: installmentSplit.monthlyAmount,
        totalTenure: installmentSplit.tenure,
        remainingTenure: installmentSplit.tenure,
        interestRate: installmentSplit.interestRate || 0,
        startDate: new Date().toISOString().split('T')[0],
        nextBillingDate: nextBilling.toISOString().split('T')[0],
        category: 'Other',
        notes: `Split payment from bill #${createdExpense.id.slice(-6)}`,
        ownerName: createdExpense.ownerName,
        ownerRole: createdExpense.ownerRole,
      };

      nextInstallments = [newInstallmentItem, ...installments];
      setInstallments(nextInstallments);
    }

    // If immediate settlement requested at creation
    if (immediateSettle) {
      createdExpense.status = 'settled';
      createdExpense.settledAt = new Date().toISOString();
      createdExpense.settlementMethod = immediateSettle.method;
      createdExpense.settlementReference = `STL-${Date.now().toString(36).toUpperCase()}`;
      createdExpense.settledFromAccountId = immediateSettle.sourceAccountId;
      
      const chargedAcc = nextAccounts[chargedAccIndex];
      if (chargedAcc) {
        createdExpense.interestAvoidedEstimate = calculateInterestSavedEstimate(
          createdExpense.amount,
          chargedAcc.apr,
          chargedAcc.gracePeriodDays
        );
      }

      // If deducted from a linked bank buffer
      if (immediateSettle.sourceAccountId) {
        const bankIdx = nextAccounts.findIndex((a) => a.id === immediateSettle.sourceAccountId);
        if (bankIdx !== -1) {
          nextAccounts[bankIdx] = {
            ...nextAccounts[bankIdx],
            totalBalance: Math.max(0, Math.round((nextAccounts[bankIdx].totalBalance - createdExpense.amount) * 100) / 100),
          };
        }
      }
    } else {
      // Unsettled expense adds to charged account balance
      if (chargedAccIndex !== -1) {
        nextAccounts[chargedAccIndex] = {
          ...nextAccounts[chargedAccIndex],
          totalBalance: Math.round((nextAccounts[chargedAccIndex].totalBalance + createdExpense.amount) * 100) / 100,
        };
      }
    }

    let nextExpenses = [createdExpense, ...expenses];

    // If recurring expense was added, automatically verify and generate any due cycles
    if (createdExpense.isRecurring) {
      const recurringCheck = processDueRecurringExpenses(nextExpenses, nextAccounts);
      nextExpenses = recurringCheck.updatedExpenses;
      nextAccounts = recurringCheck.updatedAccounts;
    }

    setExpenses(nextExpenses);
    setAccounts(nextAccounts);
    triggerAutoSave(nextAccounts, nextInstallments, settings, paidScheduleIds, scheduledScheduleIds, nextExpenses);
  };

  // Quick Log single expense from Daily Hub without modal
  const handleQuickLogExpense = (data: {
    amount: number;
    title: string;
    category: ExpenseCategory;
    accountId: string;
    immediateSettle?: boolean;
  }) => {
    const acc = accounts.find((a) => a.id === data.accountId);
    const primaryBank = accounts.find((a) => a.type === 'bank_account');
    const immediate = data.immediateSettle ? {
      method: 'instant_fpx' as SettlementMethod,
      sourceAccountId: primaryBank?.id,
    } : undefined;

    handleAddExpense(
      {
        accountId: data.accountId,
        accountName: acc?.name || 'Account',
        accountType: acc?.type || 'credit_card',
        title: data.title,
        category: data.category,
        amount: data.amount,
        date: new Date().toISOString().split('T')[0],
        status: data.immediateSettle ? 'settled' : 'unsettled',
        paymentMode: acc?.type === 'ewallet_pay_later' ? 'bnpl' : acc?.type === 'bank_account' ? 'cash' : 'credit_card',
        settlementMethod: data.immediateSettle ? 'instant_fpx' : undefined,
        ownerName: currentUser?.name,
        ownerRole: currentUser?.familyRole,
      },
      immediate
    );
  };

  // Update / Modify existing expense
  const handleUpdateExpense = (updatedExpense: ExpenseItem) => {
    const oldExpense = expenses.find((e) => e.id === updatedExpense.id);
    let nextAccounts = [...accounts];

    if (oldExpense) {
      // Revert old unsettled impact
      if (oldExpense.status !== 'settled' && oldExpense.accountId) {
        nextAccounts = nextAccounts.map((a) => {
          if (a.id === oldExpense.accountId && a.type !== 'bank_account') {
            return {
              ...a,
              totalBalance: Math.max(0, Math.round((a.totalBalance - oldExpense.amount) * 100) / 100),
            };
          }
          return a;
        });
      }

      // Apply new unsettled impact
      if (updatedExpense.status !== 'settled' && updatedExpense.accountId) {
        nextAccounts = nextAccounts.map((a) => {
          if (a.id === updatedExpense.accountId && a.type !== 'bank_account') {
            return {
              ...a,
              totalBalance: Math.round((a.totalBalance + updatedExpense.amount) * 100) / 100,
            };
          }
          return a;
        });
      }
    }

    let nextExpenses = expenses.map((e) => (e.id === updatedExpense.id ? updatedExpense : e));

    // If updated expense is recurring, process any due occurrences
    if (updatedExpense.isRecurring) {
      const recurringCheck = processDueRecurringExpenses(nextExpenses, nextAccounts);
      nextExpenses = recurringCheck.updatedExpenses;
      nextAccounts = recurringCheck.updatedAccounts;
    }

    setExpenses(nextExpenses);
    setAccounts(nextAccounts);
    triggerAutoSave(nextAccounts, installments, settings, paidScheduleIds, scheduledScheduleIds, nextExpenses);
  };

  // Force advance / simulate next month's recurring expense entry
  const handleForceGenerateRecurringCycle = (parentExpense: ExpenseItem) => {
    const result = forceGenerateNextRecurringMonth(parentExpense, expenses, accounts);
    setExpenses(result.updatedExpenses);
    setAccounts(result.updatedAccounts);
    triggerAutoSave(result.updatedAccounts, installments, settings, paidScheduleIds, scheduledScheduleIds, result.updatedExpenses);
    setAutoSaveStatus('Generated next month bill');
  };

  // Delete expense
  const handleDeleteExpense = (expenseId: string) => {
    const target = expenses.find((e) => e.id === expenseId);
    let nextAccounts = [...accounts];

    if (target && target.status !== 'settled' && target.accountId) {
      nextAccounts = nextAccounts.map((a) => {
        if (a.id === target.accountId && a.type !== 'bank_account') {
          return {
            ...a,
            totalBalance: Math.max(0, Math.round((a.totalBalance - target.amount) * 100) / 100),
          };
        }
        return a;
      });
    }

    const nextExpenses = expenses.filter((e) => e.id !== expenseId);
    setExpenses(nextExpenses);
    setAccounts(nextAccounts);
    triggerAutoSave(nextAccounts, installments, settings, paidScheduleIds, scheduledScheduleIds, nextExpenses);
  };

  // Immediate Settlement for any existing purchase
  const handleImmediateSettleExpense = (
    expenseId: string,
    settlementDetails: {
      method: SettlementMethod;
      amountSettled: number;
      sourceAccountId?: string;
      referenceCode: string;
      notes?: string;
    }
  ) => {
    let nextAccounts = [...accounts];
    const targetExpense = expenses.find((e) => e.id === expenseId);
    if (!targetExpense) return;

    const chargedAcc = nextAccounts.find((a) => a.id === targetExpense.accountId);
    const interestSaved = chargedAcc 
      ? calculateInterestSavedEstimate(settlementDetails.amountSettled, chargedAcc.apr, chargedAcc.gracePeriodDays)
      : 0;

    // 1. Update expense status to settled
    const nextExpenses = expenses.map((e) => {
      if (e.id === expenseId) {
        return {
          ...e,
          status: 'settled' as const,
          settledAt: new Date().toISOString(),
          settlementMethod: settlementDetails.method,
          settlementReference: settlementDetails.referenceCode,
          settledFromAccountId: settlementDetails.sourceAccountId,
          interestAvoidedEstimate: interestSaved,
          notes: settlementDetails.notes || e.notes,
        };
      }
      return e;
    });

    // 2. Reduce the charged account's statement and total balances
    if (chargedAcc) {
      const chargedIndex = nextAccounts.findIndex((a) => a.id === chargedAcc.id);
      if (chargedIndex !== -1) {
        const newTotal = Math.max(0, Math.round((chargedAcc.totalBalance - settlementDetails.amountSettled) * 100) / 100);
        const newStatement = Math.max(0, Math.round((chargedAcc.statementBalance - settlementDetails.amountSettled) * 100) / 100);
        nextAccounts[chargedIndex] = {
          ...chargedAcc,
          totalBalance: newTotal,
          statementBalance: newStatement,
          lastSyncedAt: new Date().toISOString(),
        };
      }
    }

    // 3. If sourceAccountId is a bank account, deduct from its buffer
    if (settlementDetails.sourceAccountId) {
      const bankIndex = nextAccounts.findIndex((a) => a.id === settlementDetails.sourceAccountId);
      if (bankIndex !== -1) {
        const bankAcc = nextAccounts[bankIndex];
        nextAccounts[bankIndex] = {
          ...bankAcc,
          totalBalance: Math.max(0, Math.round((bankAcc.totalBalance - settlementDetails.amountSettled) * 100) / 100),
        };
      }
    }

    setExpenses(nextExpenses);
    setAccounts(nextAccounts);
    triggerAutoSave(nextAccounts, installments, settings, paidScheduleIds, scheduledScheduleIds, nextExpenses);
  };

  // Convert large purchase to installment plan
  const handleConvertToInstallment = (expense: ExpenseItem) => {
    const totalMonths = expense.amount > 1500 ? 6 : 3;
    const monthly = Math.round((expense.amount / totalMonths) * 100) / 100;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 30);
    
    const newInstallment: InstallmentPlan = {
      id: `inst-conv-${Date.now()}`,
      accountId: expense.accountId,
      accountName: expense.accountName,
      title: `${expense.title} (0% Plan)`,
      category: 'Electronics',
      totalAmount: expense.amount,
      monthlyAmount: monthly,
      remainingTenure: totalMonths,
      totalTenure: totalMonths,
      interestRate: 0,
      startDate: new Date().toISOString().split('T')[0],
      nextBillingDate: nextDate.toISOString().split('T')[0],
      notes: `Converted from expense #${expense.id.slice(-6)}`,
      ownerName: expense.ownerName,
      ownerRole: expense.ownerRole,
    };

    const nextInstallments = [...installments, newInstallment];
    setInstallments(nextInstallments);

    // Mark expense as converted in notes
    const nextExpenses = expenses.map((e) => 
      e.id === expense.id 
        ? { ...e, notes: `${e.notes ? e.notes + ' • ' : ''}Converted to ${totalMonths}-Mo 0% Installment Plan` }
        : e
    );
    setExpenses(nextExpenses);

    triggerAutoSave(accounts, nextInstallments, settings, paidScheduleIds, scheduledScheduleIds, nextExpenses);
    setActiveTab('installments');
  };

  // Batch settle all pending / unsettled swipes
  const handleBatchSettleUnsettled = (expenseIds: string[]) => {
    const idSet = new Set(expenseIds);
    let totalDeducted = 0;

    const nextExpenses = expenses.map((e) => {
      if (idSet.has(e.id) && e.status === 'unsettled') {
        totalDeducted += e.amount;
        const charged = accounts.find((a) => a.id === e.accountId);
        const estSaved = charged 
          ? calculateInterestSavedEstimate(e.amount, charged.apr, charged.gracePeriodDays)
          : 0;

        return {
          ...e,
          status: 'settled' as const,
          settledAt: new Date().toISOString(),
          settlementMethod: 'instant_fpx' as SettlementMethod,
          settlementReference: `BATCH-${Date.now().toString(36).toUpperCase()}`,
          interestAvoidedEstimate: estSaved,
        };
      }
      return e;
    });

    // Reduce statement balances across accounts
    const nextAccounts = accounts.map((acc) => {
      const settledForThisAcc = expenses
        .filter((e) => idSet.has(e.id) && e.status === 'unsettled' && e.accountId === acc.id)
        .reduce((sum, e) => sum + e.amount, 0);

      if (settledForThisAcc > 0) {
        return {
          ...acc,
          totalBalance: Math.max(0, Math.round((acc.totalBalance - settledForThisAcc) * 100) / 100),
          statementBalance: Math.max(0, Math.round((acc.statementBalance - settledForThisAcc) * 100) / 100),
          lastSyncedAt: new Date().toISOString(),
        };
      }
      return acc;
    });

    setExpenses(nextExpenses);
    setAccounts(nextAccounts);
    triggerAutoSave(nextAccounts, installments, settings, paidScheduleIds, scheduledScheduleIds, nextExpenses);
  };

  // Purge all pending/unsettled swipes awaiting settlement
  const handleClearUnsettledSwipes = () => {
    const nextExpenses = expenses.filter((e) => e.status !== 'unsettled');
    setExpenses(nextExpenses);
    triggerAutoSave(accounts, installments, settings, paidScheduleIds, scheduledScheduleIds, nextExpenses);
    setAutoSaveStatus('Pending swipes cleared');
  };

  // Mark single alert as read
  const handleMarkAlertRead = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  // Clear all alerts
  const handleClearAllAlerts = () => {
    setAlerts([]);
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
        currentCurrency={settings.currency || 'MYR'}
        onCurrencyChange={(newCurr) => {
          const updated = { ...settings, currency: newCurr };
          setSettings(updated);
          triggerAutoSave(accounts, installments, updated, paidScheduleIds, scheduledScheduleIds);
        }}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onOpenConnectBank={() => setIsConnectBankOpen(true)}
        onOpenAIAdvisor={() => setIsAIAdvisorOpen(true)}
        onOpenFamilySync={() => setIsFamilySyncOpen(true)}
        onOpenSettings={(tab) => {
          setIncomeSettingsInitialTab(tab || 'salary');
          setIsIncomeSettingsOpen(true);
        }}
        onOpenBankAdvisor={() => {
          setAdvisorTargetAccountId(undefined);
          setIsBankAdvisorOpen(true);
        }}
        onRecordExpense={() => {
          setUniversalQuickAddInitialTab('expense');
          setIsUniversalQuickAddOpen(true);
        }}
        onOpenQuickAdd={(tab) => {
          setUniversalQuickAddInitialTab(tab || 'expense');
          setIsUniversalQuickAddOpen(true);
        }}
        onOpenResetDatabase={() => setIsDatabaseResetOpen(true)}
        onLogout={handleLogout}
        onSyncAll={() => handleSyncAll()}
        isSyncing={isSyncing}
        lastSyncedTime={lastSyncedTime}
      />

      {/* Dedicated Database Status Banner */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">
              Dedicated Database: <code className="font-mono text-indigo-300 font-semibold">{currentUser.databaseId}</code>
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-400 hidden sm:inline">
              Assigned to: <strong className="text-white">{currentUser.name}</strong> ({currentUser.familyRole})
            </span>
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              currentUser.tier === 'pro'
                ? 'bg-gradient-to-r from-amber-500/20 to-indigo-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}>
              {currentUser.tier === 'pro' ? (
                <>
                  <Crown className="w-3 h-3 text-amber-400 fill-current" />
                  <span>Pro Plan</span>
                </>
              ) : (
                <span>Free Plan</span>
              )}
            </span>
            {currentUser.tier === 'pro' ? (
              <button
                onClick={() => {
                  setUpgradeReason('');
                  setIsUpgradeModalOpen(true);
                }}
                className="px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-white border border-indigo-500/40 text-[10px] font-bold cursor-pointer transition-colors"
              >
                Manage Subscription
              </button>
            ) : (
              <button
                onClick={() => {
                  setUpgradeReason('Upgrade to Pro to eliminate all quotas and unlock unlimited accounts & recurring automations.');
                  setIsUpgradeModalOpen(true);
                }}
                className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white border border-amber-500/40 text-[10px] font-bold cursor-pointer transition-colors"
              >
                Upgrade to Pro
              </button>
            )}
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
            <button
              type="button"
              onClick={() => setIsDatabaseResetOpen(true)}
              className="text-rose-400 hover:text-rose-300 font-medium cursor-pointer flex items-center gap-1 hover:underline text-[11px]"
              title="Reset database for fresh restart"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset DB</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-4 space-y-4 sm:space-y-6">
        {/* Top Sticky Navigation Tabs Bar */}
        <div className="sticky top-16 z-20 bg-slate-950/95 backdrop-blur-md py-2.5 sm:py-3 border-b border-slate-800/80 -mx-3 px-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-semibold">
            {/* Tab: Today */}
            <button
              id="tab-today-hub"
              onClick={() => setActiveTab('today')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer min-h-[42px] ${
                activeTab === 'today'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/25 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/90'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Today's Command Hub</span>
            </button>

            {/* Tab: Executive Overview */}
            <button
              id="tab-overview"
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer min-h-[42px] ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/25 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/90'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Executive Overview</span>
            </button>

            {/* Tab: Strategy & Cash Flow */}
            <button
              id="tab-strategy-hub"
              onClick={() => setActiveTab('strategy')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer min-h-[42px] ${
                activeTab === 'strategy' || activeTab === 'optimizer' || activeTab === 'cycle_matrix' || activeTab === 'installments' || activeTab === 'rewards_balancer'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/25 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/90'
              }`}
            >
              <Sliders className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Strategy & Cash Flow</span>
            </button>

            {/* Tab: Daily Expenses */}
            <button
              id="tab-expenses"
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer min-h-[42px] ${
                activeTab === 'expenses'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/25 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/90'
              }`}
            >
              <Receipt className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Daily Expenses</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === 'expenses' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
              }`}>
                {expenses.length}
              </span>
            </button>

            {/* Tab: Accounts & Automations */}
            <button
              id="tab-accounts"
              onClick={() => setActiveTab('accounts')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer min-h-[42px] ${
                activeTab === 'accounts' || activeTab === 'standing_instructions'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/25 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/90'
              }`}
            >
              <Building2 className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Accounts & Automations</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === 'accounts' || activeTab === 'standing_instructions' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
              }`}>
                {accounts.length}
              </span>
            </button>
          </div>
        </div>

        {/* Tab: Executive Overview Full Page */}
        {activeTab === 'overview' && (
          <ExecutiveOverview
            accounts={accounts}
            installments={installments}
            settings={settings}
            expenses={expenses}
            onOpenIncomeSettings={() => setIsIncomeSettingsOpen(true)}
            onOpenBankAdvisor={(accId) => {
              setAdvisorTargetAccountId(accId);
              setIsBankAdvisorOpen(true);
            }}
            onUpdateSpendingCap={(newCap) => {
              const updated = { ...settings, monthlySpendingCap: newCap };
              handleSaveIncomeSettings(updated);
            }}
          />
        )}

        {/* Tab: Today's Daily Command Center */}
        {activeTab === 'today' && (
          <div className="space-y-5">
            {/* Quick Macro Ribbon on Today */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Allocated Cash Buffer</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {formatCurrency(settings.allocatedCashForBills, settings.currency || 'MYR')}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-800 hidden sm:block" />
                <div>
                  <span className="text-slate-400 text-[10px] block">Monthly Spending Cap</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {formatCurrency(settings.monthlySpendingCap || 4000, settings.currency || 'MYR')}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-800 hidden sm:block" />
                <div>
                  <span className="text-slate-400 text-[10px] block">Active Accounts</span>
                  <span className="font-mono font-bold text-indigo-300 text-sm">
                    {accounts.length} linked
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOverviewExpandedOnToday(!isOverviewExpandedOnToday)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/80 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isOverviewExpandedOnToday ? 'Hide Macro Overview' : 'Expand Macro Overview'}</span>
                  {isOverviewExpandedOnToday ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="px-3 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Full Overview Tab</span>
                  <ArrowRightLeft className="w-3 h-3 text-indigo-400" />
                </button>
              </div>
            </div>

            {/* Conditionally Expanded Full Executive Overview on Today View */}
            {isOverviewExpandedOnToday && (
              <ExecutiveOverview
                accounts={accounts}
                installments={installments}
                settings={settings}
                expenses={expenses}
                onOpenIncomeSettings={() => setIsIncomeSettingsOpen(true)}
                onOpenBankAdvisor={(accId) => {
                  setAdvisorTargetAccountId(accId);
                  setIsBankAdvisorOpen(true);
                }}
                onUpdateSpendingCap={(newCap) => {
                  const updated = { ...settings, monthlySpendingCap: newCap };
                  handleSaveIncomeSettings(updated);
                }}
              />
            )}

            <DailyHub
              accounts={accounts}
              installments={installments}
              schedule={schedule}
              expenses={expenses}
              standingInstructions={standingInstructions}
              settings={settings}
              currency={settings.currency || 'MYR'}
              quickPayTemplates={quickPayTemplates}
              onSelectQuickPayForPay={(tpl) => {
                setSelectedQuickPayTemplate(tpl);
                setIsQuickPayExecuteOpen(true);
              }}
              onOpenManageQuickPay={() => setIsQuickPayManageOpen(true)}
              onOpenCreateQuickPay={() => setIsQuickPayManageOpen(true)}
              onQuickLogExpense={handleQuickLogExpense}
              onOpenReceiptCapture={() => setIsReceiptCaptureOpen(true)}
              onOpenAIAdvisor={() => setIsAIAdvisorOpen(true)}
              onOpenBankAdvisor={(accId) => {
                setAdvisorTargetAccountId(accId);
                setIsBankAdvisorOpen(true);
              }}
              onOpenUniversalQuickAdd={(tab) => {
                setUniversalQuickAddInitialTab(tab || 'expense');
                setIsUniversalQuickAddOpen(true);
              }}
              onToggleScheduleStatus={(billId) => {
                if (!paidScheduleIds.has(billId)) {
                  const nextPaid = new Set(paidScheduleIds);
                  const nextScheduled = new Set(scheduledScheduleIds);
                  nextScheduled.delete(billId);
                  nextPaid.add(billId);
                  setPaidScheduleIds(nextPaid);
                  setScheduledScheduleIds(nextScheduled);
                  triggerAutoSave(accounts, installments, settings, nextPaid, nextScheduled);
                }
              }}
              onImmediateSettleExpense={handleImmediateSettleExpense}
              onBatchSettleUnsettled={handleBatchSettleUnsettled}
              onClearUnsettledSwipes={handleClearUnsettledSwipes}
              onSwitchTab={(tab) => {
                setActiveTab(tab);
              }}
              onDeleteExpense={handleDeleteExpense}
            />
          </div>
        )}

        {/* Tab 2: Strategy & Cash Flow Hub (Sequencer, Float Calendar, Installments, Rewards Balancer) */}
        {(activeTab === 'strategy' || activeTab === 'optimizer' || activeTab === 'cycle_matrix' || activeTab === 'installments' || activeTab === 'rewards_balancer') && (
          <StrategyCashFlowHub
            initialView={
              activeTab === 'cycle_matrix'
                ? 'cycle_matrix'
                : activeTab === 'installments'
                ? 'installments'
                : activeTab === 'rewards_balancer'
                ? 'rewards_balancer'
                : 'sequencer'
            }
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
            onAdviseSettlement={(accId) => {
              setAdvisorTargetAccountId(accId);
              setIsBankAdvisorOpen(true);
            }}
            installments={installments}
            projections={projections}
            onAddInstallment={handleAddInstallment}
            onDeleteInstallment={handleDeleteInstallment}
            currency={settings.currency || 'MYR'}
            expenses={expenses}
            onUpdateAccount={handleUpdateAccount}
            onQuickLogExpense={(prefill) => {
              setStandaloneExpenseInitialAccount(prefill.accountId);
              setIsStandaloneExpenseModalOpen(true);
            }}
          />
        )}

        {/* Tab 4: Connected Accounts & Recurring Automations Hub */}
        {(activeTab === 'accounts' || activeTab === 'standing_instructions') && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800 w-fit">
                <button
                  id="subtab-accounts-cards"
                  onClick={() => setAccountsSubTab('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    accountsSubTab === 'cards'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Linked Accounts ({accounts.length})</span>
                </button>
                <button
                  id="subtab-accounts-standing-instructions"
                  onClick={() => setAccountsSubTab('standing_instructions')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    accountsSubTab === 'standing_instructions'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CalendarClock className="w-3.5 h-3.5" />
                  <span>Standing Instructions ({standingInstructions.length})</span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {accountsSubTab === 'cards' ? (
                  <>
                    <button
                      onClick={() => {
                        const bank = accounts.find((a) => a.type === 'bank_account');
                        setSelectedBankAccountIdForUpdate(bank?.id);
                        setIsUpdateBankBalanceOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Update Bank Balance</span>
                    </button>
                    <button
                      onClick={() => setIsFamilySyncOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/40 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Sync Partner Accounts</span>
                    </button>
                    <button
                      onClick={() => {
                        setUniversalQuickAddInitialTab('account');
                        setIsUniversalQuickAddOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Link New Account</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setUniversalQuickAddInitialTab('recurring');
                      setIsUniversalQuickAddOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Standing Instruction</span>
                  </button>
                )}
              </div>
            </div>

            {accountsSubTab === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((acc) => {
                const isBank = acc.type === 'bank_account';
                const utilRatio = Math.round((acc.statementBalance / (acc.creditLimit || 1)) * 100);
                const accExpenses = expenses.filter((e) => e.accountId === acc.id);
                const pendingCount = accExpenses.filter((e) => e.status !== 'settled').length;

                if (isBank) {
                  return (
                    <div
                      key={acc.id}
                      className="p-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/20 hover:border-emerald-500/50 transition-all space-y-3 relative group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-md bg-emerald-600 text-white"
                          >
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-white text-sm">{acc.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Liquid Cash
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

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedAccountForEdit(acc);
                              setIsEditAccountOpen(true);
                            }}
                            className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit Account Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(acc.id)}
                            className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Disconnect Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Liquid Cash Display */}
                      <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/50 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium">Available Liquid Cash</span>
                          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Settlement Liquidity
                          </span>
                        </div>
                        <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                          {formatCurrency(acc.totalBalance, settings.currency)}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                          <span>Verified: {acc.lastSyncedAt ? new Date(acc.lastSyncedAt).toLocaleDateString() : 'Active'}</span>
                          <span>FPX & Direct Pay Ready</span>
                        </div>
                      </div>

                      {/* Action Buttons for Bank */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => {
                            setSelectedBankAccountIdForUpdate(acc.id);
                            setIsUpdateBankBalanceOpen(true);
                          }}
                          className="w-full py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-emerald-600/30"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          <span>Update Balance</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAccountForTransactions(acc);
                            setIsAccountTransactionsOpen(true);
                          }}
                          className="w-full py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                        >
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Transactions ({accExpenses.length})</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                const isShared = !!(acc.isSharedLimit && acc.sharedLimitGroupId);
                const siblingCards = isShared ? accounts.filter((a) => a.sharedLimitGroupId === acc.sharedLimitGroupId) : [acc];
                const pooledLimit = isShared ? (acc.sharedCreditLimit || acc.creditLimit) : acc.creditLimit;
                const pooledTotalBalance = siblingCards.reduce((sum, c) => sum + (c.totalBalance || 0), 0);
                const pooledUtilRatio = Math.round((pooledTotalBalance / (pooledLimit || 1)) * 100);
                const activeUtilRatio = isShared ? pooledUtilRatio : utilRatio;

                const displayDueDay = acc.dueDay || (acc.dueDate ? parseInt(acc.dueDate.split('-')[2] || '0', 10) : null);

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
                          {renderAccountIcon(acc.type, 'w-5 h-5 text-white')}
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
                            {isShared && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1">
                                <Layers className="w-2.5 h-2.5" />
                                <span>Shared Limit</span>
                              </span>
                            )}
                            {acc.ownerName && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-slate-800 border border-slate-700 text-slate-300">
                                {acc.ownerName}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{acc.institution} • {acc.accountNumberMask}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedAccountForEdit(acc);
                            setIsEditAccountOpen(true);
                          }}
                          className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit Account Details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(acc.id)}
                          className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Disconnect Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Shared limit pooled summary if applicable */}
                    {isShared && (
                      <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/20 text-[11px] text-amber-200/90 space-y-1">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="flex items-center gap-1 text-amber-300">
                            <Layers className="w-3 h-3" />
                            <span>{acc.sharedLimitGroupName || 'Shared Credit Limit'}</span>
                          </span>
                          <span className="text-amber-400 font-mono font-bold">
                            {formatCurrency(pooledLimit, settings.currency)} Combined
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Pooled Across: {siblingCards.map((c) => c.name.replace(/Maybank 2 Cards \((.*?)\)/, '$1')).join(' + ')}</span>
                          <span>{formatCurrency(Math.max(0, pooledLimit - pooledTotalBalance), settings.currency)} Available</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-700/50">
                      <div>
                        <span className="text-[11px] text-slate-400">Card Balance</span>
                        <div className="font-bold text-white">{formatCurrency(acc.totalBalance, settings.currency)}</div>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400">Statement Due</span>
                        <div className="font-bold text-amber-400">{formatCurrency(acc.statementBalance, settings.currency)}</div>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400">Statement Issued</span>
                        <div className="font-medium text-indigo-300">Day {acc.cycleDay} of month</div>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400">Settlement Due</span>
                        <div className="font-medium text-amber-300">
                          Day {displayDueDay || 'N/A'} {acc.dueDate ? `(${acc.dueDate})` : ''}
                        </div>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400">Grace Float</span>
                        <div className="font-medium text-emerald-400">{acc.gracePeriodDays} Days 0% Float</div>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400">Unsettled Swipes</span>
                        <div className="font-medium text-indigo-300 font-mono">
                          {pendingCount} pending
                        </div>
                      </div>
                    </div>

                    {/* Utilization mini-bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>
                          {isShared ? 'Pooled Limit: ' : 'Limit: '}
                          {formatCurrency(isShared ? pooledLimit : acc.creditLimit, settings.currency)}
                        </span>
                        <span className={activeUtilRatio > 50 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                          {activeUtilRatio}% used {isShared ? '(pooled)' : ''}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            activeUtilRatio > 50 ? 'bg-rose-500' : activeUtilRatio > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, utilRatio)}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Buttons for Card / BNPL */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => {
                          setSelectedAccountForTransactions(acc);
                          setIsAccountTransactionsOpen(true);
                        }}
                        className="w-full py-1.5 px-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Transactions ({accExpenses.length})</span>
                      </button>
                      <button
                        onClick={() => {
                          setStandaloneExpenseInitialAccount(acc.id);
                          setStandaloneEditingExpense(null);
                          setIsStandaloneExpenseModalOpen(true);
                        }}
                        className="w-full py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Record Swipe</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <StandingInstructionsManager
              standingInstructions={standingInstructions}
              accounts={accounts}
              currency={settings.currency || 'MYR'}
              onAdd={handleAddStandingInstruction}
              onUpdate={handleUpdateStandingInstruction}
              onDelete={handleDeleteStandingInstruction}
              onExecuteNow={handleExecuteStandingInstructionNow}
              currentUser={currentUser}
              onUpgradeToPro={() => {
                setUpgradeReason('Free Plan Limit: Maximum of 3 standing instructions reached. Upgrade to Pro for unlimited recurring automations.');
                setIsUpgradeModalOpen(true);
              }}
            />
          )}
          </div>
        )}

        {/* Tab 5: Expenses Hub & Immediate Settlement */}
        {activeTab === 'expenses' && (
          <ExpensesHub
            expenses={expenses}
            accounts={accounts}
            currency={settings.currency || 'MYR'}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
            onImmediateSettleExpense={handleImmediateSettleExpense}
            onConvertToInstallment={handleConvertToInstallment}
            onBatchSettleUnsettled={handleBatchSettleUnsettled}
            onOpenReceiptCapture={() => setIsReceiptCaptureOpen(true)}
            onOpenAccountTransactions={(acc) => {
              setSelectedAccountForTransactions(acc);
              setIsAccountTransactionsOpen(true);
            }}
            onOpenUpdateBankBalance={(accId) => {
              setSelectedBankAccountIdForUpdate(accId);
              setIsUpdateBankBalanceOpen(true);
            }}
            onEditAccount={(acc) => {
              setSelectedAccountForEdit(acc);
              setIsEditAccountOpen(true);
            }}
            onForceGenerateRecurringCycle={handleForceGenerateRecurringCycle}
          />
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
        currentUser={currentUser}
        onIncrementUsage={() => {
          if (currentUser) {
            UserDatabaseService.incrementAiConsultationUsage(currentUser.id);
            const updated = UserDatabaseService.getActiveUser();
            if (updated) setCurrentUser(updated);
          }
        }}
        onUpgradeToPro={() => {
          setIsAIAdvisorOpen(false);
          setUpgradeReason('Free Plan Limit: Monthly AI consultation limit reached. Upgrade to Pro for unlimited analyses.');
          setIsUpgradeModalOpen(true);
        }}
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

      {/* Receipt Camera & Upload OCR Extraction Modal */}
      <ReceiptCaptureModal
        isOpen={isReceiptCaptureOpen}
        onClose={() => setIsReceiptCaptureOpen(false)}
        accounts={accounts}
        currency={settings.currency || 'MYR'}
        currentUser={currentUser}
        onExpenseAdded={handleReceiptExpenseAdded}
        onUpgradeToPro={() => {
          setIsReceiptCaptureOpen(false);
          setUpgradeReason('Free Plan Limit: Monthly receipt extraction quota reached. Upgrade to Pro for unlimited extractions.');
          setIsUpgradeModalOpen(true);
        }}
      />

      {/* Upgrade to Pro Modal */}
      {currentUser && (
        <UpgradeToProModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          currentUser={currentUser}
          onUpgrade={handleUpgradeToPro}
          onCancelSubscription={handleCancelSubscription}
          featureTriggered={upgradeReason}
          currency={settings.currency || 'MYR'}
        />
      )}

      {/* Family Synchronization & Export/Import Modal */}
      {userDb && (
        <FamilySyncModal
          isOpen={isFamilySyncOpen}
          onClose={() => setIsFamilySyncOpen(false)}
          currentUser={currentUser}
          currentDb={userDb}
          onDatabaseUpdated={handleDatabaseUpdated}
          onSwitchUser={handleSwitchUser}
          onUserUpdated={(updatedUser) => setCurrentUser(updatedUser)}
          onOpenResetDatabase={() => setIsDatabaseResetOpen(true)}
        />
      )}

      {/* Income & Paycheck Settings Modal */}
      <IncomeSettingsModal
        isOpen={isIncomeSettingsOpen}
        onClose={() => setIsIncomeSettingsOpen(false)}
        settings={settings}
        accounts={accounts}
        bankAccounts={accounts.filter((a) => a.type === 'bank_account')}
        expenses={expenses}
        currentUser={currentUser || undefined}
        currentDb={userDb || undefined}
        initialTab={incomeSettingsInitialTab}
        onSaveSettings={handleSaveIncomeSettings}
        onDatabaseRestored={handleDatabaseUpdated}
      />

      {/* Bank Settlement Advisor & Scheduler Modal */}
      <BankSettlementAdvisorModal
        isOpen={isBankAdvisorOpen}
        onClose={() => setIsBankAdvisorOpen(false)}
        accounts={accounts}
        settings={settings}
        standingInstructions={standingInstructions}
        scheduledTransactions={bankScheduledTransactions}
        initialSelectedAccountId={advisorTargetAccountId}
        onScheduleTransaction={handleScheduleBankTransaction}
        onExecuteTransaction={handleExecuteBankTransaction}
        onCancelTransaction={handleCancelBankTransaction}
        onOpenIncomeSettings={() => {
          setIsBankAdvisorOpen(false);
          setIsIncomeSettingsOpen(true);
        }}
        onImmediateSettleAccount={handleImmediateSettleAccount}
      />

      {/* Update Bank Balance Modal */}
      <UpdateBankBalanceModal
        isOpen={isUpdateBankBalanceOpen}
        onClose={() => {
          setIsUpdateBankBalanceOpen(false);
          setSelectedBankAccountIdForUpdate(undefined);
        }}
        accounts={accounts}
        currency={settings.currency || 'MYR'}
        selectedAccountId={selectedBankAccountIdForUpdate}
        onUpdateBalance={handleUpdateBankBalance}
      />

      {/* Account Specific Transactions & Settlement Manager */}
      <AccountTransactionsModal
        isOpen={isAccountTransactionsOpen}
        onClose={() => {
          setIsAccountTransactionsOpen(false);
          setSelectedAccountForTransactions(null);
        }}
        account={selectedAccountForTransactions}
        accounts={accounts}
        expenses={expenses}
        currency={settings.currency || 'MYR'}
        onAddExpense={() => {
          if (selectedAccountForTransactions) {
            setStandaloneExpenseInitialAccount(selectedAccountForTransactions.id);
            setStandaloneEditingExpense(null);
            setIsStandaloneExpenseModalOpen(true);
          }
        }}
        onUpdateExpense={handleUpdateExpense}
        onDeleteExpense={handleDeleteExpense}
        onImmediateSettleExpense={handleImmediateSettleExpense}
        onUpdateAccount={handleUpdateAccount}
        onOpenUpdateBankBalance={(accId) => {
          setSelectedBankAccountIdForUpdate(accId);
          setIsUpdateBankBalanceOpen(true);
        }}
        onSyncStatementFromTransactions={handleSyncAccountBalanceFromTransactions}
      />

      {/* Edit Account Modal */}
      <EditAccountModal
        isOpen={isEditAccountOpen}
        onClose={() => {
          setIsEditAccountOpen(false);
          setSelectedAccountForEdit(null);
        }}
        account={selectedAccountForEdit}
        allAccounts={accounts}
        currency={settings.currency || 'MYR'}
        onUpdateAccount={handleUpdateAccount}
        onSave={handleUpdateAccount}
        onDelete={handleDeleteAccount}
      />

      {/* Standalone Expense Modal for account-targeted transactions */}
      <ExpenseModal
        isOpen={isStandaloneExpenseModalOpen}
        onClose={() => {
          setIsStandaloneExpenseModalOpen(false);
          setStandaloneEditingExpense(null);
          setStandaloneExpenseInitialAccount(undefined);
        }}
        editingExpense={standaloneEditingExpense}
        accounts={accounts}
        expenses={expenses}
        currency={settings.currency || 'MYR'}
        initialAccountId={standaloneExpenseInitialAccount}
        onDeleteExpense={handleDeleteExpense}
        onSaveExpense={(data, immediateSettle, installmentSplit) => {
          if (standaloneEditingExpense && standaloneEditingExpense.id) {
            handleUpdateExpense({
              ...standaloneEditingExpense,
              ...data,
            });
          } else {
            handleAddExpense(data, immediateSettle, installmentSplit);
          }
          setIsStandaloneExpenseModalOpen(false);
          setStandaloneEditingExpense(null);
          setStandaloneExpenseInitialAccount(undefined);
        }}
      />

      {/* Universal Quick Add Modal (Unified entry point for expenses, bank balance, accounts, recurring) */}
      <UniversalQuickAddModal
        isOpen={isUniversalQuickAddOpen}
        onClose={() => setIsUniversalQuickAddOpen(false)}
        accounts={accounts}
        expenses={expenses}
        currency={settings.currency || 'MYR'}
        initialTab={universalQuickAddInitialTab}
        onAddExpense={(data, immediateSettle, installmentSplit) => {
          handleAddExpense(data, immediateSettle, installmentSplit);
        }}
        onUpdateBankBalance={(accId, newBal, note) => {
          handleUpdateBankBalance(accId, newBal, note);
        }}
        onAddAccount={(newAcc) => {
          handleAddAccount(newAcc);
        }}
        onAddStandingInstruction={(si) => {
          handleAddStandingInstruction(si);
        }}
        onOpenReceiptCapture={() => {
          setIsUniversalQuickAddOpen(false);
          setIsReceiptCaptureOpen(true);
        }}
        quickPayTemplates={quickPayTemplates}
        onSaveQuickPayTemplate={handleSaveQuickPayTemplate}
        onSelectQuickPayForPay={(tpl) => {
          setIsUniversalQuickAddOpen(false);
          setSelectedQuickPayTemplate(tpl);
          setIsQuickPayExecuteOpen(true);
        }}
      />

      {/* Quick Pay Execution Modal (1-Click instant settlement) */}
      {isQuickPayExecuteOpen && selectedQuickPayTemplate && (
        <QuickPayExecuteModal
          isOpen={isQuickPayExecuteOpen}
          onClose={() => {
            setIsQuickPayExecuteOpen(false);
            setSelectedQuickPayTemplate(null);
          }}
          template={selectedQuickPayTemplate}
          accounts={accounts}
          currency={settings.currency || 'MYR'}
          onExecuteSettlement={handleExecuteQuickPaySettlement}
        />
      )}

      {/* Quick Pay Templates Management Modal */}
      {isQuickPayManageOpen && (
        <QuickPayManageModal
          isOpen={isQuickPayManageOpen}
          onClose={() => setIsQuickPayManageOpen(false)}
          templates={quickPayTemplates}
          accounts={accounts}
          currency={settings.currency || 'MYR'}
          onSaveTemplate={handleSaveQuickPayTemplate}
          onDeleteTemplate={handleDeleteQuickPayTemplate}
          onSelectForPay={(tpl) => {
            setSelectedQuickPayTemplate(tpl);
            setIsQuickPayExecuteOpen(true);
          }}
        />
      )}

      {/* Database Fresh Restart Modal */}
      {currentUser && (
        <DatabaseResetModal
          isOpen={isDatabaseResetOpen}
          onClose={() => setIsDatabaseResetOpen(false)}
          currentUser={currentUser}
          onDatabaseReset={handleDatabaseReset}
          onFactoryReset={handleFactoryReset}
        />
      )}

      {/* Floating Quick Action Button for fast single-click action across any tab */}
      <button
        id="btn-floating-quick-add"
        onClick={() => {
          setUniversalQuickAddInitialTab('expense');
          setIsUniversalQuickAddOpen(true);
        }}
        className="fixed bottom-6 right-6 z-30 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-xl shadow-indigo-600/35 flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 transition-all group"
        title="Quick Add: Swipe, Balance, Account, or Recurring"
      >
        <Plus className="w-5 h-5 font-bold group-hover:rotate-90 transition-transform duration-200" />
        <span className="text-xs font-bold tracking-wide">Quick Add</span>
      </button>
    </div>
  );
}
