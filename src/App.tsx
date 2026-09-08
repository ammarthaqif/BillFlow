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
  SettlementMethod,
  StandingInstruction
} from './types';
import { 
  INITIAL_ACCOUNTS, 
  INITIAL_INSTALLMENTS, 
  INITIAL_SETTINGS,
  INITIAL_EXPENSES,
  INITIAL_STANDING_INSTRUCTIONS
} from './data/seedData';
import { 
  calculatePaymentSchedule, 
  generateAlerts, 
  projectMonthlyCashFlow 
} from './utils/paymentOptimizer';
import { UserDatabaseService } from './services/userDatabaseService';
import { formatCurrency } from './utils/currency';
import { renderAccountIcon, getAccountTypeLabel, calculateInterestSavedEstimate } from './utils/accountUtils';

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
import { ExpensesHub } from './components/ExpensesHub';
import { StandingInstructionsManager } from './components/StandingInstructionsManager';
import { ReceiptCaptureModal } from './components/ReceiptCaptureModal';
import { UpgradeToProModal } from './components/UpgradeToProModal';

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
  Crown
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
  // State: User settings
  const [settings, setSettings] = useState<UserSettings>(INITIAL_SETTINGS);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'optimizer' | 'cycle_matrix' | 'installments' | 'accounts' | 'expenses' | 'standing_instructions'>('optimizer');

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
  const [isReceiptCaptureOpen, setIsReceiptCaptureOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string>('');

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
      setExpenses(db.expenses && db.expenses.length > 0 ? db.expenses : INITIAL_EXPENSES);
      setStandingInstructions(db.standingInstructions && db.standingInstructions.length > 0 ? db.standingInstructions : INITIAL_STANDING_INSTRUCTIONS);
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
    updatedScheduled: Set<string>,
    updatedExpenses?: ExpenseItem[],
    updatedStandingInstructions?: StandingInstruction[]
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
  }, [currentUser, userDb, alertThresholds, expenses, standingInstructions]);

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

  // Add new account with Free Tier limit check
  const handleAddAccount = async (newAcc: Omit<BillAccount, 'id' | 'apiSynced' | 'lastSyncedAt' | 'status' | 'accountNumberMask'>) => {
    if (currentUser?.tier === 'free' && accounts.length >= (currentUser.tierLimits?.maxLinkedAccounts || 3)) {
      setUpgradeReason(`Free Tier Limit: You have reached the maximum of ${currentUser.tierLimits?.maxLinkedAccounts || 3} linked accounts. Upgrade to Pro for unlimited accounts.`);
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

  // Upgrade to Pro handler
  const handleUpgradeToPro = () => {
    if (!currentUser) return;
    const updated = UserDatabaseService.upgradeToPro(currentUser.id);
    if (updated) {
      setCurrentUser(updated);
      setAutoSaveStatus('Upgraded to Pro!');
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

    const nextExpenses = [createdExpense, ...expenses];
    setExpenses(nextExpenses);
    setAccounts(nextAccounts);
    triggerAutoSave(nextAccounts, nextInstallments, settings, paidScheduleIds, scheduledScheduleIds, nextExpenses);
  };

  // Update / Modify existing expense
  const handleUpdateExpense = (updatedExpense: ExpenseItem) => {
    const nextExpenses = expenses.map((e) => (e.id === updatedExpense.id ? updatedExpense : e));
    setExpenses(nextExpenses);
    triggerAutoSave(accounts, installments, settings, paidScheduleIds, scheduledScheduleIds, nextExpenses);
  };

  // Delete expense
  const handleDeleteExpense = (expenseId: string) => {
    const nextExpenses = expenses.filter((e) => e.id !== expenseId);
    setExpenses(nextExpenses);
    triggerAutoSave(accounts, installments, settings, paidScheduleIds, scheduledScheduleIds, nextExpenses);
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
        onRecordExpense={() => setActiveTab('expenses')}
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
            {currentUser.tier === 'free' && (
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

          <button
            id="tab-expenses"
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Daily Bills & Expenses ({expenses.length})</span>
          </button>

          <button
            id="tab-standing-instructions"
            onClick={() => setActiveTab('standing_instructions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'standing_instructions'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            <span>Standing Instructions & Scheduled ({standingInstructions.length})</span>
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
          />
        )}

        {/* Tab 6: Recurring Bills & Standing Instructions */}
        {activeTab === 'standing_instructions' && (
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
          featureTriggered={upgradeReason}
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
        />
      )}
    </div>
  );
}
