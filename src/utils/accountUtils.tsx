import React from 'react';
import { 
  CreditCard, 
  Wallet, 
  Building2, 
  Home, 
  Car, 
  Briefcase, 
  Landmark,
  Zap,
  QrCode,
  ArrowRightLeft,
  Banknote,
  Smartphone,
  Wifi,
  Droplets,
  Tv,
  Film,
  Radio,
  ShoppingBag,
  Utensils,
  Laptop,
  Plane,
  Activity,
  GraduationCap,
  Receipt,
  SplitSquareVertical,
  Calendar
} from 'lucide-react';
import { AccountType, SettlementMethod, ExpenseCategory, PaymentMode, RepaymentStructure } from '../types';

export function getAccountTypeLabel(type: AccountType): string {
  switch (type) {
    case 'credit_card':
      return 'Credit Card';
    case 'ewallet_pay_later':
      return 'E-Wallet / BNPL';
    case 'personal_loan':
      return 'Personal Loan';
    case 'housing_loan':
      return 'Housing / Mortgage';
    case 'automotive_loan':
      return 'Automotive / Car Loan';
    case 'bank_account':
      return 'Bank Account / Buffer';
    case 'other_loan':
      return 'Credit Facility / Loan';
    default:
      return type;
  }
}

export function getAccountTypeTheme(type: AccountType) {
  switch (type) {
    case 'credit_card':
      return {
        label: 'Credit Card',
        bg: 'bg-indigo-500/15',
        text: 'text-indigo-400',
        border: 'border-indigo-500/30',
        color: '#6366f1',
      };
    case 'ewallet_pay_later':
      return {
        label: 'BNPL / Pay Later',
        bg: 'bg-orange-500/15',
        text: 'text-orange-400',
        border: 'border-orange-500/30',
        color: '#f97316',
      };
    case 'personal_loan':
      return {
        label: 'Personal Loan',
        bg: 'bg-purple-500/15',
        text: 'text-purple-400',
        border: 'border-purple-500/30',
        color: '#a855f7',
      };
    case 'housing_loan':
      return {
        label: 'Housing Loan',
        bg: 'bg-blue-500/15',
        text: 'text-blue-400',
        border: 'border-blue-500/30',
        color: '#3b82f6',
      };
    case 'automotive_loan':
      return {
        label: 'Auto Loan',
        bg: 'bg-amber-500/15',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        color: '#eab308',
      };
    case 'bank_account':
      return {
        label: 'Bank Account',
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        color: '#10b981',
      };
    case 'other_loan':
    default:
      return {
        label: 'Financing / Loan',
        bg: 'bg-slate-500/15',
        text: 'text-slate-300',
        border: 'border-slate-500/30',
        color: '#64748b',
      };
  }
}

export const renderAccountIcon = (type: AccountType, className = 'w-4 h-4') => {
  switch (type) {
    case 'credit_card':
      return <CreditCard className={className} />;
    case 'ewallet_pay_later':
      return <Wallet className={className} />;
    case 'personal_loan':
      return <Briefcase className={className} />;
    case 'housing_loan':
      return <Home className={className} />;
    case 'automotive_loan':
      return <Car className={className} />;
    case 'bank_account':
      return <Landmark className={className} />;
    case 'other_loan':
    default:
      return <Building2 className={className} />;
  }
};

export const SETTLEMENT_METHODS_CONFIG: {
  id: SettlementMethod;
  name: string;
  description: string;
  badge: string;
  icon: typeof Zap;
}[] = [
  {
    id: 'instant_fpx',
    name: 'Instant FPX / Online Banking',
    description: 'Immediate debit from your current/savings account',
    badge: 'Zero Waiting',
    icon: Zap,
  },
  {
    id: 'duitnow_qr',
    name: 'DuitNow QR / Instant Pay',
    description: 'Direct account-to-merchant zero-debt clearing',
    badge: 'Instant QR',
    icon: QrCode,
  },
  {
    id: 'jompay',
    name: 'JomPAY Malaysian Biller',
    description: 'National bill payment scheme using Biller Code & Ref-1',
    badge: 'National Standard',
    icon: Receipt,
  },
  {
    id: 'bank_transfer',
    name: 'Bank Transfer / GIRO',
    description: 'Electronic funds transfer directly to card/loan account',
    badge: 'Same Day',
    icon: ArrowRightLeft,
  },
  {
    id: 'debit_card',
    name: 'Direct Debit Card Settlement',
    description: 'Immediately offset swipe using primary debit card buffer',
    badge: 'Instant Clearing',
    icon: CreditCard,
  },
  {
    id: 'cash_funds',
    name: 'Liquid Cash / Buffer Pool',
    description: 'Offset from monthly designated cash flow budget',
    badge: 'Liquid Reserve',
    icon: Banknote,
  },
];

export const EXPENSE_CATEGORIES_LIST: ExpenseCategory[] = [
  'QR Payment',
  'Dining & Groceries',
  'Phone & Mobile',
  'Internet & Broadband',
  'Utilities (Electricity, Water, IWK)',
  'Entertainment & Streaming',
  'Retail & Shopping',
  'Electronics & Gadgets',
  'Travel & Transit',
  'Vehicle & Fuel',
  'Home & Utilities',
  'Healthcare & Medical',
  'Education',
  'Loan Repayment',
  'Other',
];

export function getExpenseCategoryIcon(category: ExpenseCategory, className = 'w-4 h-4') {
  switch (category) {
    case 'QR Payment':
      return <QrCode className={className} />;
    case 'Phone & Mobile':
      return <Smartphone className={className} />;
    case 'Internet & Broadband':
      return <Wifi className={className} />;
    case 'Utilities (Electricity, Water, IWK)':
      return <Zap className={className} />;
    case 'Entertainment & Streaming':
      return <Film className={className} />;
    case 'Retail & Shopping':
    case 'Shopping & Retail':
      return <ShoppingBag className={className} />;
    case 'Dining & Groceries':
      return <Utensils className={className} />;
    case 'Electronics & Gadgets':
      return <Laptop className={className} />;
    case 'Travel & Transit':
      return <Plane className={className} />;
    case 'Vehicle & Fuel':
      return <Car className={className} />;
    case 'Healthcare & Medical':
      return <Activity className={className} />;
    case 'Education':
      return <GraduationCap className={className} />;
    case 'Home & Utilities':
      return <Home className={className} />;
    case 'Loan Repayment':
      return <Building2 className={className} />;
    default:
      return <Receipt className={className} />;
  }
}

export interface DayToDayBillPreset {
  id: string;
  name: string;
  shortLabel: string;
  category: ExpenseCategory;
  defaultMerchant: string;
  defaultTitle: string;
  typicalAmount: number;
  icon: typeof Zap;
  color: string;
  preferredPaymentMode: PaymentMode;
  defaultRepayment: RepaymentStructure;
}

export const POPULAR_BILL_PRESETS: DayToDayBillPreset[] = [
  {
    id: 'preset-duitnow-qr',
    name: 'DuitNow QR Payment',
    shortLabel: 'DuitNow QR',
    category: 'QR Payment',
    defaultMerchant: 'DuitNow QR Merchant',
    defaultTitle: 'DuitNow QR Merchant Payment',
    typicalAmount: 45.00,
    icon: QrCode,
    color: '#ec4899',
    preferredPaymentMode: 'duitnow_qr',
    defaultRepayment: 'lump_sum',
  },
  {
    id: 'preset-tnb',
    name: 'Electricity (TNB)',
    shortLabel: 'TNB Electricity',
    category: 'Utilities (Electricity, Water, IWK)',
    defaultMerchant: 'Tenaga Nasional Berhad (TNB)',
    defaultTitle: 'TNB Electricity Monthly Bill',
    typicalAmount: 185.00,
    icon: Zap,
    color: '#eab308',
    preferredPaymentMode: 'credit_card',
    defaultRepayment: 'lump_sum',
  },
  {
    id: 'preset-water',
    name: 'Water (Air Selangor / PBA)',
    shortLabel: 'Water Bill',
    category: 'Utilities (Electricity, Water, IWK)',
    defaultMerchant: 'Pengurusan Air Selangor',
    defaultTitle: 'Air Selangor Water Monthly Bill',
    typicalAmount: 38.50,
    icon: Droplets,
    color: '#0284c7',
    preferredPaymentMode: 'cash',
    defaultRepayment: 'lump_sum',
  },
  {
    id: 'preset-iwk',
    name: 'Indah Water (IWK)',
    shortLabel: 'IWK Sewerage',
    category: 'Utilities (Electricity, Water, IWK)',
    defaultMerchant: 'Indah Water Konsortium (IWK)',
    defaultTitle: 'IWK Sewerage Sanitary Utility',
    typicalAmount: 16.00,
    icon: Building2,
    color: '#0d9488',
    preferredPaymentMode: 'bnpl',
    defaultRepayment: 'lump_sum',
  },
  {
    id: 'preset-unifi',
    name: 'UNIFI Home Fibre',
    shortLabel: 'UNIFI Broadband',
    category: 'Internet & Broadband',
    defaultMerchant: 'Telekom Malaysia (UNIFI)',
    defaultTitle: 'UNIFI 300Mbps Home Fibre Subscription',
    typicalAmount: 139.00,
    icon: Wifi,
    color: '#ea580c',
    preferredPaymentMode: 'credit_card',
    defaultRepayment: 'lump_sum',
  },
  {
    id: 'preset-phone',
    name: 'Phone Bill (CelcomDigi / Maxis)',
    shortLabel: 'Phone Postpaid',
    category: 'Phone & Mobile',
    defaultMerchant: 'CelcomDigi / Maxis',
    defaultTitle: '5G Postpaid Mobile Phone Bill',
    typicalAmount: 98.00,
    icon: Smartphone,
    color: '#3b82f6',
    preferredPaymentMode: 'credit_card',
    defaultRepayment: 'lump_sum',
  },
  {
    id: 'preset-netflix',
    name: 'Netflix Subscription',
    shortLabel: 'Netflix 4K',
    category: 'Entertainment & Streaming',
    defaultMerchant: 'Netflix International',
    defaultTitle: 'Netflix Premium Ultra HD Monthly Plan',
    typicalAmount: 55.00,
    icon: Film,
    color: '#e11d48',
    preferredPaymentMode: 'credit_card',
    defaultRepayment: 'lump_sum',
  },
  {
    id: 'preset-disney',
    name: 'Disney+ Hotstar',
    shortLabel: 'Disney+ Hotstar',
    category: 'Entertainment & Streaming',
    defaultMerchant: 'Disney+ Hotstar Malaysia',
    defaultTitle: 'Disney+ Hotstar Premium Plan',
    typicalAmount: 39.90,
    icon: Tv,
    color: '#6366f1',
    preferredPaymentMode: 'credit_card',
    defaultRepayment: 'lump_sum',
  },
  {
    id: 'preset-astro',
    name: 'ASTRO Television',
    shortLabel: 'ASTRO Ultra',
    category: 'Entertainment & Streaming',
    defaultMerchant: 'ASTRO Malaysia Holdings',
    defaultTitle: 'ASTRO Ultra Box Satellite & Streaming Pack',
    typicalAmount: 119.00,
    icon: Radio,
    color: '#ec4899',
    preferredPaymentMode: 'credit_card',
    defaultRepayment: 'lump_sum',
  },
  {
    id: 'preset-retail-split',
    name: 'Retail / BNPL Purchase',
    shortLabel: 'Retail / Shopping',
    category: 'Retail & Shopping',
    defaultMerchant: 'Shopee / Atome Retail Merchant',
    defaultTitle: 'Retail Purchase (Gadgets & Fashion)',
    typicalAmount: 450.00,
    icon: ShoppingBag,
    color: '#f97316',
    preferredPaymentMode: 'bnpl',
    defaultRepayment: 'split_months',
  },
];

/**
 * Calculates estimated interest saved by settling a swipe immediately
 * instead of carrying it over average revolving period (typically 30-60 days at account APR).
 */
export function calculateInterestSavedEstimate(amount: number, apr: number, daysAvoided = 30): number {
  if (apr <= 0 || amount <= 0) return 0;
  // Daily compounding approximation: amount * (apr / 100) * (days / 365)
  const interest = (amount * (apr / 100) * daysAvoided) / 365;
  return Math.round(interest * 100) / 100;
}

export function renderSettlementMethodBadge(method?: SettlementMethod): string {
  if (!method) return 'Settled';
  const found = SETTLEMENT_METHODS_CONFIG.find((m) => m.id === method);
  return found ? found.name : method.replace('_', ' ').toUpperCase();
}

