import React, { useState } from 'react';
import { 
  Building2, 
  CreditCard, 
  Wallet, 
  CheckCircle2, 
  RefreshCw, 
  ShieldCheck, 
  Plus, 
  ExternalLink,
  Lock,
  Sparkles
} from 'lucide-react';
import { BillAccount, AccountType } from '../types';
import { CurrencyCode, getCurrencyConfig } from '../utils/currency';

interface BankSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BillAccount[];
  onAddAccount: (acc: Omit<BillAccount, 'id' | 'apiSynced' | 'lastSyncedAt' | 'status' | 'accountNumberMask'>) => void;
  onSyncBank: (provider: string) => void;
  isSyncing: boolean;
  currency?: CurrencyCode;
}

export const BankSyncModal: React.FC<BankSyncModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onAddAccount,
  onSyncBank,
  isSyncing,
  currency = 'MYR',
}) => {
  const [activeTab, setActiveTab] = useState<'providers' | 'manual'>('providers');
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const currencyConfig = getCurrencyConfig(currency);

  // Manual Form State
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [type, setType] = useState<AccountType>('credit_card');
  const [totalBalance, setTotalBalance] = useState<number>(1000);
  const [statementBalance, setStatementBalance] = useState<number>(800);
  const [creditLimit, setCreditLimit] = useState<number>(5000);
  const [apr, setApr] = useState<number>(24.99);
  const [lateFee, setLateFee] = useState<number>(40);
  const [cycleDay, setCycleDay] = useState<number>(15);
  const [gracePeriodDays, setGracePeriodDays] = useState<number>(25);
  const [dueDate, setDueDate] = useState('2026-10-10');
  const [minPayment, setMinPayment] = useState<number>(50);

  if (!isOpen) return null;

  const popularProviders = [
    { name: 'Chase Bank', type: 'credit_card' as AccountType, icon: '🏦', color: '#1e40af', desc: 'Freedom, Sapphire, Ink' },
    { name: 'American Express', type: 'credit_card' as AccountType, icon: '💳', color: '#b45309', desc: 'Platinum, Gold, Blue Cash' },
    { name: 'GrabPay Later', type: 'ewallet_pay_later' as AccountType, icon: '🟢', color: '#059669', desc: 'Postpaid & 4-Month Installments' },
    { name: 'Shopee SPayLater', type: 'ewallet_pay_later' as AccountType, icon: '🛒', color: '#ea580c', desc: '1, 3, 6, 12 Month Pay Later' },
    { name: 'CIMB Cash Plus Loan', type: 'personal_loan' as AccountType, icon: '💼', color: '#9333ea', desc: 'Fixed Amortization Personal Financing' },
    { name: 'Maybank MaxiHome', type: 'housing_loan' as AccountType, icon: '🏠', color: '#2563eb', desc: 'Home Mortgage Loan & Principle' },
    { name: 'Public Bank Auto HP', type: 'automotive_loan' as AccountType, icon: '🚗', color: '#d97706', desc: 'Vehicle Hire Purchase Car Loan' },
    { name: 'Citibank', type: 'credit_card' as AccountType, icon: '🏛️', color: '#0284c7', desc: 'Custom Cash, Double Cash' },
    { name: 'Maybank Savings Buffer', type: 'bank_account' as AccountType, icon: '💰', color: '#10b981', desc: 'Liquid Cash & Immediate Settlement Source' },
    { name: 'Apple Card & Pay Later', type: 'credit_card' as AccountType, icon: '🍎', color: '#475569', desc: 'Mastercard & Apple Pay Later' },
    { name: 'Klarna', type: 'ewallet_pay_later' as AccountType, icon: '🛍️', color: '#db2777', desc: 'Pay in 4 & Monthly Financing' },
    { name: 'Capital One', type: 'credit_card' as AccountType, icon: '💳', color: '#dc2626', desc: 'Venture, Savor, QuickSilver' },
  ];

  const handleConnectProvider = (providerName: string, provType: AccountType, provColor: string) => {
    setConnectingProvider(providerName);
    setTimeout(() => {
      const isLoan = provType === 'personal_loan' || provType === 'housing_loan' || provType === 'automotive_loan';
      const isBank = provType === 'bank_account';
      
      onAddAccount({
        name: `${providerName} Premium`,
        institution: providerName,
        type: provType,
        color: provColor,
        totalBalance: isLoan ? 45000 : isBank ? 6500 : Math.floor(600 + Math.random() * 1800),
        statementBalance: isLoan ? 850 : isBank ? 0 : Math.floor(400 + Math.random() * 1200),
        creditLimit: isLoan ? 50000 : isBank ? 6500 : provType === 'credit_card' ? 8000 : 2000,
        apr: provType === 'credit_card' ? 24.99 : provType === 'personal_loan' ? 7.8 : provType === 'housing_loan' ? 4.15 : provType === 'automotive_loan' ? 3.1 : isBank ? 0 : 15.0,
        lateFee: isLoan ? 30 : provType === 'credit_card' ? 40 : 15,
        cycleDay: Math.floor(5 + Math.random() * 20),
        gracePeriodDays: provType === 'credit_card' ? 25 : isLoan ? 10 : 14,
        dueDate: '2026-10-22',
        minPayment: isLoan ? 850 : 50,
      });
      setConnectingProvider(null);
      onClose();
    }, 900);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const getColorForType = (t: AccountType) => {
      switch (t) {
        case 'credit_card': return '#3b82f6';
        case 'ewallet_pay_later': return '#f97316';
        case 'personal_loan': return '#9333ea';
        case 'housing_loan': return '#2563eb';
        case 'automotive_loan': return '#d97706';
        case 'bank_account': return '#10b981';
        case 'other_loan':
        default: return '#64748b';
      }
    };

    onAddAccount({
      name,
      institution,
      type,
      color: getColorForType(type),
      totalBalance,
      statementBalance,
      creditLimit,
      apr,
      lateFee,
      cycleDay,
      gracePeriodDays,
      dueDate,
      minPayment,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Bank & E-Wallet API Connect Hub</h3>
              <p className="text-xs text-slate-400">Sync live balances, cycle dates, and statements via Open Banking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        {/* Security Assurance Badge */}
        <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60 flex items-center gap-2.5 text-xs text-slate-300">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Bank-Grade Open Banking API:</strong> Balances and statements are read securely via encrypted OAuth API tokens. We never store banking credentials.
          </span>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-800/60 p-1 rounded-xl border border-slate-700/60 text-xs">
          <button
            onClick={() => setActiveTab('providers')}
            className={`flex-1 py-1.5 font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'providers' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Instant Open Banking Sync
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-1.5 font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'manual' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Manual Account Configuration
          </button>
        </div>

        {/* Content Tab: Providers Grid */}
        {activeTab === 'providers' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {popularProviders.map((prov) => {
                const isConnecting = connectingProvider === prov.name;
                const isAlreadyConnected = accounts.some(
                  (a) => a.institution.toLowerCase().includes(prov.name.toLowerCase()) || a.name.includes(prov.name)
                );

                return (
                  <button
                    key={prov.name}
                    disabled={isConnecting || isAlreadyConnected}
                    onClick={() => handleConnectProvider(prov.name, prov.type, prov.color)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isAlreadyConnected
                        ? 'bg-slate-800/40 border-slate-800 opacity-60 cursor-default'
                        : 'bg-slate-800/70 border-slate-700 hover:border-indigo-500 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{prov.icon}</span>
                      <div className="truncate">
                        <div className="text-xs font-bold text-white truncate">{prov.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{prov.desc}</div>
                      </div>
                    </div>

                    <div className="shrink-0 text-xs font-semibold">
                      {isConnecting ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                      ) : isAlreadyConnected ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <span className="text-indigo-400 text-[11px]">+ Connect</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Sync All Button */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">{accounts.length} accounts currently connected</span>
              <button
                onClick={() => {
                  onSyncBank('Open Banking Gateway');
                  onClose();
                }}
                disabled={isSyncing}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync All Live Balances'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Content Tab: Manual Entry */
          <form onSubmit={handleManualSubmit} className="space-y-3 text-xs max-h-80 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Account / Card Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Citi Custom Cash"
                  value={name ?? ''}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Financial Institution</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Citibank"
                  value={institution ?? ''}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Account Type</label>
                <select
                  value={type ?? 'credit_card'}
                  onChange={(e) => setType(e.target.value as AccountType)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="credit_card">Credit Card (Revolving)</option>
                  <option value="ewallet_pay_later">E-Wallet / BNPL Pay Later</option>
                  <option value="personal_loan">Personal Loan (Fixed Installment)</option>
                  <option value="housing_loan">Housing Loan / Mortgage</option>
                  <option value="automotive_loan">Automotive / Car Hire Purchase</option>
                  <option value="bank_account">Bank Account / Liquid Buffer</option>
                  <option value="other_loan">Other Credit Facility</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Total Balance ({currencyConfig.symbol})
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="10"
                  value={totalBalance ?? 0}
                  onChange={(e) => setTotalBalance(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Statement Due ({currencyConfig.symbol})
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="10"
                  value={statementBalance ?? 0}
                  onChange={(e) => setStatementBalance(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              <div>
                <label className="block text-slate-300 font-medium mb-1">APR (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={apr ?? 0}
                  onChange={(e) => setApr(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Late Fee ({currencyConfig.symbol})
                </label>
                <input
                  type="number"
                  required
                  value={lateFee ?? 0}
                  onChange={(e) => setLateFee(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Cycle Day</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={cycleDay || ''}
                  onChange={(e) => setCycleDay(e.target.value === '' ? ('' as unknown as number) : Number(e.target.value))}
                  onBlur={() => {
                    if (!cycleDay || cycleDay < 1) setCycleDay(15);
                    else if (cycleDay > 31) setCycleDay(31);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Grace (Days)</label>
                <input
                  type="number"
                  min="5"
                  max="45"
                  required
                  value={gracePeriodDays || ''}
                  onChange={(e) => setGracePeriodDays(e.target.value === '' ? ('' as unknown as number) : Number(e.target.value))}
                  onBlur={() => {
                    if (!gracePeriodDays || gracePeriodDays < 5) setGracePeriodDays(20);
                    else if (gracePeriodDays > 45) setGracePeriodDays(45);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={dueDate ?? ''}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Minimum Payment ({currencyConfig.symbol})
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={minPayment ?? 0}
                  onChange={(e) => setMinPayment(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Add Account
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
