import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  DollarSign, 
  Calendar, 
  Landmark, 
  ShieldCheck, 
  Check, 
  Target,
  FileSpreadsheet,
  Download,
  Upload,
  Database,
  AlertTriangle,
  CheckCircle2,
  Filter,
  FileText,
  RefreshCw,
  HardDrive,
  Globe,
  Clock
} from 'lucide-react';
import { UserSettings, BillAccount, ExpenseItem, UserProfile, UserDedicatedDatabase } from '../types';
import { formatCurrency, CurrencyCode } from '../utils/currency';
import { downloadTransactionsCSV, computeCSVStats, CSVExportOptions } from '../utils/csvExport';
import { UserDatabaseService } from '../services/userDatabaseService';
import { 
  COMMON_TIMEZONES, 
  getTimezoneDisplayInfo, 
  getUserTimezone 
} from '../utils/timezone';

export interface IncomeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  accounts?: BillAccount[];
  bankAccounts?: BillAccount[];
  expenses?: ExpenseItem[];
  currentUser?: UserProfile;
  currentDb?: UserDedicatedDatabase;
  initialTab?: 'salary' | 'csv' | 'backup';
  onSaveSettings: (updated: UserSettings) => void;
  onDatabaseRestored?: (restoredDb: UserDedicatedDatabase) => void;
}

export const IncomeSettingsModal: React.FC<IncomeSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  accounts = [],
  bankAccounts: passedBankAccounts,
  expenses = [],
  currentUser,
  currentDb,
  initialTab = 'salary',
  onSaveSettings,
  onDatabaseRestored,
}) => {
  const currency: CurrencyCode = settings.currency || 'MYR';
  const [activeTab, setActiveTab] = useState<'salary' | 'csv' | 'backup'>(initialTab);

  // Sync initial tab when opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const bankAccounts = useMemo(() => {
    if (passedBankAccounts && passedBankAccounts.length > 0) return passedBankAccounts;
    return (accounts || []).filter((a) => a.type === 'bank_account');
  }, [accounts, passedBankAccounts]);

  // Salary / Paycheck States
  const [incomeInput, setIncomeInput] = useState<string>(settings.monthlyIncome?.toString() ?? '6500');
  const [schedule, setSchedule] = useState<'monthly' | 'bi_monthly' | 'weekly'>(settings.paycheckSchedule ?? 'bi_monthly');
  const [paycheckDates, setPaycheckDates] = useState<number[]>(settings.paycheckDates ?? [1, 15]);
  const [primaryBankId, setPrimaryBankId] = useState<string>(settings.primaryBankAccountId ?? (bankAccounts[0]?.id ?? ''));
  const [safetyBufferInput, setSafetyBufferInput] = useState<string>(settings.safetyBufferAmount?.toString() ?? '300');
  const [spendingCapInput, setSpendingCapInput] = useState<string>(settings.monthlySpendingCap?.toString() ?? '5000');
  const [userTimezone, setUserTimezone] = useState<string>(settings.timezone || 'Asia/Kuala_Lumpur');

  // CSV Export Filter States
  const [csvStatusFilter, setCsvStatusFilter] = useState<'all' | 'settled' | 'unsettled'>('all');
  const [csvCategoryFilter, setCsvCategoryFilter] = useState<string>('all');
  const [csvExportSuccess, setCsvExportSuccess] = useState<string | null>(null);

  // Backup & Restore States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupExportSuccess, setBackupExportSuccess] = useState<string | null>(null);
  const [uploadedBackupPayload, setUploadedBackupPayload] = useState<any | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const [isConfirmingRestore, setIsConfirmingRestore] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setIncomeInput(settings.monthlyIncome?.toString() ?? '6500');
      setSchedule(settings.paycheckSchedule ?? 'bi_monthly');
      setPaycheckDates(settings.paycheckDates ?? [1, 15]);
      setPrimaryBankId(settings.primaryBankAccountId ?? (bankAccounts[0]?.id ?? ''));
      setSafetyBufferInput(settings.safetyBufferAmount?.toString() ?? '300');
      setSpendingCapInput(settings.monthlySpendingCap?.toString() ?? '5000');
      setUserTimezone(settings.timezone || getUserTimezone(settings));
      setCsvExportSuccess(null);
      setBackupExportSuccess(null);
      setUploadedBackupPayload(null);
      setUploadedFileName(null);
      setRestoreError(null);
      setRestoreSuccess(null);
      setIsConfirmingRestore(false);
    }
  }, [isOpen, settings, bankAccounts]);

  const numericIncome = Math.max(0, parseFloat(incomeInput) || 0);
  const numericBuffer = Math.max(0, parseFloat(safetyBufferInput) || 0);
  const numericSpendingCap = Math.max(0, parseFloat(spendingCapInput) || 0);

  // Quick preset incomes
  const incomePresets = [3500, 5000, 6500, 8500, 12000, 15000];

  // Calculate paycheck drops
  let amountPerDrop = numericIncome;
  if (schedule === 'bi_monthly') {
    amountPerDrop = Math.round((numericIncome / Math.max(1, paycheckDates.length)) * 100) / 100;
  } else if (schedule === 'weekly') {
    amountPerDrop = Math.round((numericIncome / 4) * 100) / 100;
  }

  const handleToggleDay = (day: number) => {
    if (schedule === 'monthly') {
      setPaycheckDates([day]);
    } else if (schedule === 'bi_monthly') {
      if (paycheckDates.includes(day)) {
        if (paycheckDates.length > 1) {
          setPaycheckDates(paycheckDates.filter((d) => d !== day));
        }
      } else {
        if (paycheckDates.length < 2) {
          setPaycheckDates([...paycheckDates, day].sort((a, b) => a - b));
        } else {
          setPaycheckDates([paycheckDates[0], day].sort((a, b) => a - b));
        }
      }
    }
  };

  const handleScheduleChange = (newSched: 'monthly' | 'bi_monthly' | 'weekly') => {
    setSchedule(newSched);
    if (newSched === 'monthly') {
      setPaycheckDates([25]);
    } else if (newSched === 'bi_monthly') {
      setPaycheckDates([1, 15]);
    } else {
      setPaycheckDates([5, 12, 19, 26]);
    }
  };

  const handleSaveSalarySettings = () => {
    const updated: UserSettings = {
      ...settings,
      timezone: userTimezone,
      monthlyIncome: numericIncome,
      paycheckSchedule: schedule,
      paycheckDates: paycheckDates.length > 0 ? paycheckDates : [1, 15],
      primaryBankAccountId: primaryBankId || undefined,
      safetyBufferAmount: numericBuffer,
      monthlySpendingCap: numericSpendingCap > 0 ? numericSpendingCap : 5000,
    };
    onSaveSettings(updated);
    onClose();
  };

  // CSV Stats & Filtered Data Preview
  const csvStats = computeCSVStats(expenses);
  const categoriesList = Array.from(new Set(expenses.map((e) => e.category).filter(Boolean)));

  const filteredExpensesForExport = useMemo(() => {
    let list = [...expenses];
    if (csvStatusFilter !== 'all') {
      list = list.filter((e) => e.status === csvStatusFilter);
    }
    if (csvCategoryFilter !== 'all') {
      list = list.filter((e) => e.category === csvCategoryFilter);
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, csvStatusFilter, csvCategoryFilter]);

  // Execute CSV Download
  const handleDownloadCSV = () => {
    const opts: CSVExportOptions = {
      statusFilter: csvStatusFilter,
      categoryFilter: csvCategoryFilter,
    };
    const result = downloadTransactionsCSV(
      expenses,
      currency,
      accounts,
      currentUser?.name || 'user',
      opts
    );
    setCsvExportSuccess(`Exported ${result.totalExported} transaction(s) to ${result.filename}`);
    setTimeout(() => setCsvExportSuccess(null), 5000);
  };

  // Execute Full Database Backup Download
  const handleDownloadDatabaseBackup = () => {
    if (!currentUser || !currentDb) {
      setBackupExportSuccess('Error: User database context is currently unavailable.');
      return;
    }
    try {
      const res = UserDatabaseService.downloadDatabaseBackup(currentUser, currentDb);
      setBackupExportSuccess(`Database backup successfully saved: ${res.filename} (${(res.jsonSize / 1024).toFixed(1)} KB)`);
      setTimeout(() => setBackupExportSuccess(null), 5000);
    } catch (err: any) {
      setBackupExportSuccess(`Export failed: ${err.message || 'Unknown error'}`);
    }
  };

  // Handle Backup File Upload
  const handleBackupFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreError(null);
    setRestoreSuccess(null);
    setIsConfirmingRestore(false);
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text.trim());
        setUploadedBackupPayload(parsed);
      } catch (err: any) {
        setRestoreError(`Invalid JSON format: ${err.message || 'Could not parse JSON file.'}`);
        setUploadedBackupPayload(null);
      }
    };
    reader.onerror = () => {
      setRestoreError('Failed to read the selected backup file.');
      setUploadedBackupPayload(null);
    };
    reader.readAsText(file);
  };

  // Execute Database Restore
  const handleExecuteRestore = () => {
    if (!uploadedBackupPayload || !currentDb || !currentUser) {
      setRestoreError('Missing database context or backup file.');
      return;
    }

    try {
      const result = UserDatabaseService.restoreDatabaseBackup(currentDb, uploadedBackupPayload, {
        mode: restoreMode,
        targetUser: currentUser,
      });

      if (onDatabaseRestored) {
        onDatabaseRestored(result.updatedDb);
      }

      setRestoreSuccess(
        result.mode === 'replace'
          ? `Complete restore successful! Restored ${result.accountsRestored} account(s), ${result.expensesRestored} transaction(s), and ${result.installmentsRestored} installment(s).`
          : `Smart merge successful! Merged ${result.accountsRestored} new account(s), ${result.expensesRestored} new transaction(s), and ${result.installmentsRestored} installment(s).`
      );

      setUploadedBackupPayload(null);
      setUploadedFileName(null);
      setIsConfirmingRestore(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setRestoreError(err.message || 'Database restore failed.');
      setIsConfirmingRestore(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Settings & Data Management</h2>
              <p className="text-xs text-slate-400">
                Income budgeting, transaction history CSV export, and database backup & restore.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-5 pt-3 border-b border-slate-800 bg-slate-950/40 gap-1 sm:gap-2">
          <button
            id="tab-salary-settings"
            type="button"
            onClick={() => setActiveTab('salary')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'salary'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Income & Budget</span>
          </button>

          <button
            id="tab-csv-export"
            type="button"
            onClick={() => setActiveTab('csv')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'csv'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Transactions (CSV)</span>
            <span className="text-[10px] bg-indigo-950 text-indigo-300 font-bold px-1.5 py-0.2 rounded-full border border-indigo-500/30">
              {expenses.length}
            </span>
          </button>

          <button
            id="tab-backup-restore"
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'backup'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Backup & Restore</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 text-xs text-slate-300 max-h-[70vh] overflow-y-auto space-y-5">
          
          {/* TAB 1: SALARY & INCOME SETTINGS */}
          {activeTab === 'salary' && (
            <div className="space-y-5">
              {/* Monthly Income Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                    <span>Monthly Net Take-Home Income</span>
                    <span className="text-[10px] text-slate-400 font-normal">(after EPF/SOCSO/Tax)</span>
                  </label>
                  <span className="text-xs font-bold text-indigo-400">
                    {formatCurrency(numericIncome, currency)}/month
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    {formatCurrency(0, currency).split(' ')[0]}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={incomeInput}
                    onChange={(e) => setIncomeInput(e.target.value)}
                    placeholder="e.g. 6500"
                    className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl pl-12 pr-4 py-2.5 text-sm text-white font-semibold focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-slate-400 text-[11px]">Quick Presets:</span>
                  {incomePresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setIncomeInput(preset.toString())}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      {formatCurrency(preset, currency)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paycheck Frequency */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <label className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Salary Deposit Schedule</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleScheduleChange('bi_monthly')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      schedule === 'bi_monthly'
                        ? 'border-indigo-500 bg-indigo-500/10 text-white'
                        : 'border-slate-800 bg-slate-950 hover:bg-slate-850 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs">Bi-Monthly (Twice/Mo)</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">e.g. 1st & 15th</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleScheduleChange('monthly')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      schedule === 'monthly'
                        ? 'border-indigo-500 bg-indigo-500/10 text-white'
                        : 'border-slate-800 bg-slate-950 hover:bg-slate-850 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs">Once a Month</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">e.g. 25th of month</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleScheduleChange('weekly')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      schedule === 'weekly'
                        ? 'border-indigo-500 bg-indigo-500/10 text-white'
                        : 'border-slate-800 bg-slate-950 hover:bg-slate-850 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs">Weekly / Staggered</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">4 drops per month</div>
                  </button>
                </div>
              </div>

              {/* Paycheck Day Selector */}
              {schedule !== 'weekly' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-300 font-medium">
                      Select Payday Date{schedule === 'bi_monthly' ? 's (Choose 2)' : ' (Choose 1)'}:
                    </span>
                    <span className="text-[11px] text-indigo-400 font-bold">
                      {paycheckDates.map((d) => `${d}th`).join(' & ')} • {formatCurrency(amountPerDrop, currency)} per drop
                    </span>
                  </div>
                  <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                      const isSelected = paycheckDates.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleToggleDay(day)}
                          className={`py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Primary Salary Credit Account */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <label className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Primary Bank Account (Salary Credit Destination)</span>
                </label>
                {bankAccounts.length === 0 ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-amber-300 text-[11px]">
                    No bank account found. Link a bank account in the Accounts tab to activate bank settlement advice.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={primaryBankId}
                      onChange={(e) => setPrimaryBankId(e.target.value)}
                      className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.institution || 'Savings/Current'}) • Liquid Balance: {formatCurrency(b.totalBalance ?? b.currentBalance ?? 0, currency)}
                        </option>
                      ))}
                    </select>

                    {/* Active Bank Verification Info */}
                    {(() => {
                      const selectedBank = bankAccounts.find((b) => b.id === primaryBankId) || bankAccounts[0];
                      if (!selectedBank) return null;
                      const bal = selectedBank.totalBalance ?? selectedBank.currentBalance ?? 0;
                      return (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-slate-300 font-medium">{selectedBank.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-[11px]">Liquid Cash:</span>
                            <span className="font-mono font-bold text-emerald-400">{formatCurrency(bal, currency)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Safety Buffer Amount */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Emergency Liquid Cash Buffer</span>
                  </label>
                  <span className="text-xs font-semibold text-emerald-400">
                    {formatCurrency(numericBuffer, currency)}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={safetyBufferInput}
                  onChange={(e) => setSafetyBufferInput(e.target.value)}
                  placeholder="e.g. 300"
                  className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white font-medium focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <p className="text-[11px] text-slate-400">
                  The Advisor will ensure you keep this minimum liquid buffer in your bank after settling any credit card statement or BNPL bill.
                </p>
              </div>

              {/* Monthly Spending Cap */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Monthly Spending Cap</span>
                    <span className="text-[10px] text-slate-400 font-normal">(Target limit)</span>
                  </label>
                  <span className="text-xs font-semibold text-indigo-400">
                    {formatCurrency(numericSpendingCap, currency)}
                  </span>
                </div>
                <input
                  type="number"
                  min="100"
                  step="500"
                  value={spendingCapInput}
                  onChange={(e) => setSpendingCapInput(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white font-medium focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <p className="text-[11px] text-slate-400">
                  Visualized on Executive Overview to track total monthly expenditures against your budget target.
                </p>
              </div>

              {/* User Timezone & Deadline Synchronization */}
              <div className="space-y-3 pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-400" />
                    <span>User Timezone & Deadline Synchronization</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setUserTimezone(getUserTimezone())}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                  >
                    Auto-Detect Browser
                  </button>
                </div>

                <select
                  value={userTimezone}
                  onChange={(e) => setUserTimezone(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label} ({tz.offset})
                    </option>
                  ))}
                </select>

                {/* Live Status Preview */}
                {(() => {
                  const tzInfo = getTimezoneDisplayInfo(userTimezone);
                  return (
                    <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                        <div>
                          <div className="text-slate-200 font-medium">
                            Today in {tzInfo.name}: <span className="font-bold text-white">{tzInfo.currentDate}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Current Local Time: <span className="font-mono text-indigo-300 font-semibold">{tzInfo.currentTime}</span> ({tzInfo.offset})
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                        Synchronized
                      </span>
                    </div>
                  );
                })()}

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Upcoming deadlines, statement cutoffs, float intelligence, payment countdowns, and daily streaks strictly adhere to your selected timezone.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: EXPORT TRANSACTION HISTORY AS CSV */}
          {activeTab === 'csv' && (
            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Export Transaction History</h3>
                      <p className="text-[11px] text-slate-400">
                        Download your complete expense records as an RFC 4180 CSV spreadsheet for Excel, Google Sheets, or Apple Numbers.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    UTF-8 BOM Compatible
                  </span>
                </div>

                {/* Summary Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Logged</span>
                    <div className="text-base font-bold text-white mt-0.5">{csvStats.totalCount}</div>
                    <span className="text-[10px] text-slate-400">transactions</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Volume</span>
                    <div className="text-base font-bold text-indigo-400 mt-0.5">
                      {formatCurrency(csvStats.totalAmount, currency)}
                    </div>
                    <span className="text-[10px] text-slate-400">recorded spend</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Settled</span>
                    <div className="text-base font-bold text-emerald-400 mt-0.5">{csvStats.settledCount}</div>
                    <span className="text-[10px] text-slate-400">{formatCurrency(csvStats.settledAmount, currency)}</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Pending Swipes</span>
                    <div className="text-base font-bold text-amber-400 mt-0.5">{csvStats.unsettledCount}</div>
                    <span className="text-[10px] text-slate-400">{formatCurrency(csvStats.unsettledAmount, currency)}</span>
                  </div>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                      <Filter className="w-3.5 h-3.5" /> Filter:
                    </span>
                    <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setCsvStatusFilter('all')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                          csvStatusFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        All ({expenses.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCsvStatusFilter('settled')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                          csvStatusFilter === 'settled' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Settled ({csvStats.settledCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCsvStatusFilter('unsettled')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                          csvStatusFilter === 'unsettled' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Pending ({csvStats.unsettledCount})
                      </button>
                    </div>

                    {categoriesList.length > 0 && (
                      <select
                        value={csvCategoryFilter}
                        onChange={(e) => setCsvCategoryFilter(e.target.value)}
                        className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1 text-[11px] outline-none"
                      >
                        <option value="all">All Categories</option>
                        {categoriesList.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <button
                    id="btn-download-transactions-csv"
                    type="button"
                    disabled={filteredExpensesForExport.length === 0}
                    onClick={handleDownloadCSV}
                    className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download CSV ({filteredExpensesForExport.length})</span>
                  </button>
                </div>
              </div>

              {/* Notification Banner */}
              {csvExportSuccess && (
                <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3 flex items-center gap-2 text-emerald-300 text-xs animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{csvExportSuccess}</span>
                </div>
              )}

              {/* Preview Table of Records */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">
                    Preview: Showing first {Math.min(5, filteredExpensesForExport.length)} of {filteredExpensesForExport.length} transactions
                  </span>
                  <span>Date span: {csvStats.earliestDate} to {csvStats.latestDate}</span>
                </div>

                {filteredExpensesForExport.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/50 rounded-xl border border-slate-800/80 text-slate-400">
                    No transactions match the selected filter.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Merchant / Description</th>
                          <th className="py-2 px-3">Category</th>
                          <th className="py-2 px-3">Account</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {filteredExpensesForExport.slice(0, 5).map((exp) => (
                          <tr key={exp.id} className="hover:bg-slate-900/40">
                            <td className="py-2 px-3 font-mono text-slate-400">{exp.date}</td>
                            <td className="py-2 px-3 font-medium text-white">{exp.title}</td>
                            <td className="py-2 px-3">
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                {exp.category}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400">{exp.accountName || 'Primary Account'}</td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  exp.status === 'settled'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {exp.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-white">
                              {formatCurrency(exp.amount, currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: BACKUP & RESTORE DATABASE */}
          {activeTab === 'backup' && (
            <div className="space-y-5">
              
              {/* SECTION A: EXPORT FULL DATABASE BACKUP */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Export Complete Database Backup</h3>
                      <p className="text-[11px] text-slate-400">
                        Save a full, unencrypted JSON snapshot of your accounts, installment contracts, transaction logs, and settings for personal offline safekeeping.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Accounts</span>
                    <div className="font-bold text-white text-sm mt-0.5">{accounts.length}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Expenses</span>
                    <div className="font-bold text-white text-sm mt-0.5">{expenses.length}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Installments</span>
                    <div className="font-bold text-white text-sm mt-0.5">{(currentDb?.installments || []).length}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Templates & Rules</span>
                    <div className="font-bold text-white text-sm mt-0.5">
                      {(currentDb?.quickPayTemplates || []).length + (currentDb?.standingInstructions || []).length}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-[11px] text-slate-400">
                    Target: {currentUser?.name} ({currentUser?.householdName})
                  </span>
                  <button
                    id="btn-download-database-backup"
                    type="button"
                    onClick={handleDownloadDatabaseBackup}
                    className="flex items-center gap-2 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Database Backup (.json)</span>
                  </button>
                </div>

                {backupExportSuccess && (
                  <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3 flex items-center gap-2 text-emerald-300 text-xs animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{backupExportSuccess}</span>
                  </div>
                )}
              </div>

              {/* SECTION B: RESTORE DATABASE FROM BACKUP FILE */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Restore Database from Backup File</h3>
                    <p className="text-[11px] text-slate-400">
                      Upload a previously exported BillFlow JSON backup file or family sync package to restore your financial data.
                    </p>
                  </div>
                </div>

                {/* File Upload Dropzone / Picker */}
                <div className="border-2 border-dashed border-slate-700/80 hover:border-indigo-500/60 rounded-xl p-5 text-center transition-colors bg-slate-900/40">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleBackupFileUpload}
                    className="hidden"
                    id="backup-file-upload-input"
                  />
                  <label htmlFor="backup-file-upload-input" className="cursor-pointer space-y-2 block">
                    <div className="w-10 h-10 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-white font-bold">
                      {uploadedFileName ? uploadedFileName : 'Click to select or drag & drop backup file (.json)'}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Accepts BillFlow Database Backups (.json) and Family Sync packages
                    </p>
                  </label>
                </div>

                {/* Uploaded File Inspection Card */}
                {uploadedBackupPayload && (
                  <div className="bg-slate-900 border border-indigo-500/40 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-400" />
                        <span className="font-bold text-white text-xs">Backup Package Inspected</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                        {uploadedBackupPayload.format || 'Standard Backup'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 space-y-1">
                      {uploadedBackupPayload.exportedBy && (
                        <div>
                          <strong>Exported By:</strong> {uploadedBackupPayload.exportedBy.userName || 'User'} (
                          {uploadedBackupPayload.exportedBy.familyRole || 'Role'} • Household:{' '}
                          {uploadedBackupPayload.exportedBy.householdName || 'Household'})
                        </div>
                      )}
                      {uploadedBackupPayload.exportedAt && (
                        <div>
                          <strong>Backup Date:</strong> {new Date(uploadedBackupPayload.exportedAt).toLocaleString()}
                        </div>
                      )}
                      <div className="pt-1 flex items-center gap-3 text-slate-400 text-[11px]">
                        <span>
                          Accounts:{' '}
                          <strong className="text-white">
                            {uploadedBackupPayload.data?.accounts?.length ??
                              uploadedBackupPayload.accounts?.length ??
                              0}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Transactions:{' '}
                          <strong className="text-white">
                            {uploadedBackupPayload.data?.expenses?.length ??
                              uploadedBackupPayload.expenses?.length ??
                              0}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Installments:{' '}
                          <strong className="text-white">
                            {uploadedBackupPayload.data?.installments?.length ??
                              uploadedBackupPayload.installments?.length ??
                              0}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Restore Mode Selector */}
                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <label className="text-xs font-semibold text-slate-200 block">Select Restore Mode:</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRestoreMode('replace')}
                          className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                            restoreMode === 'replace'
                              ? 'border-indigo-500 bg-indigo-500/10 text-white'
                              : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-850'
                          }`}
                        >
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Complete Restore (Replace)</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Replaces current database partition with the backup snapshot.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRestoreMode('merge')}
                          className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                            restoreMode === 'merge'
                              ? 'border-indigo-500 bg-indigo-500/10 text-white'
                              : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-850'
                          }`}
                        >
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Smart Merge</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Keeps existing data and appends accounts, expenses, and installment contracts.
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Confirm Warning or Trigger Button */}
                    {!isConfirmingRestore ? (
                      <div className="pt-2 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedBackupPayload(null);
                            setUploadedFileName(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 text-xs font-semibold cursor-pointer"
                        >
                          Clear File
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingRestore(true)}
                          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/20 cursor-pointer"
                        >
                          Proceed to Restore...
                        </button>
                      </div>
                    ) : (
                      <div className="pt-2 bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 space-y-3">
                        <div className="flex items-start gap-2 text-amber-300 text-xs">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                          <div>
                            <strong className="block text-amber-200">
                              {restoreMode === 'replace' ? 'Warning: Database Replacement' : 'Confirm Smart Merge'}
                            </strong>
                            <span>
                              {restoreMode === 'replace'
                                ? 'This operation will replace your current database records with the snapshot from the backup file.'
                                : 'This operation will add missing accounts and transaction entries to your active database.'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsConfirmingRestore(false)}
                            className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800 text-xs font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            id="btn-confirm-execute-restore"
                            type="button"
                            onClick={handleExecuteRestore}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            <span>Confirm & Restore Database</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Error Banner */}
                {restoreError && (
                  <div className="bg-rose-950/50 border border-rose-500/40 rounded-xl p-3 flex items-center gap-2 text-rose-300 text-xs animate-in fade-in duration-200">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{restoreError}</span>
                  </div>
                )}

                {/* Success Banner */}
                {restoreSuccess && (
                  <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3 flex items-center gap-2 text-emerald-300 text-xs animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{restoreSuccess}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400">
            {activeTab === 'salary'
              ? 'Auto-calculates required bank balance across all statement cycles.'
              : activeTab === 'csv'
              ? 'Exported file is compatible with standard spreadsheet software.'
              : 'All database backup and restore operations execute locally in-browser.'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
            {activeTab === 'salary' && (
              <button
                type="button"
                onClick={handleSaveSalarySettings}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
              >
                Save Income Settings
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
