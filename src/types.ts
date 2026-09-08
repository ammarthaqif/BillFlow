import { CurrencyCode } from './utils/currency';

export type { CurrencyCode };

export type AccountType = 
  | 'credit_card' 
  | 'ewallet_pay_later' 
  | 'personal_loan' 
  | 'housing_loan' 
  | 'automotive_loan' 
  | 'bank_account' 
  | 'other_loan';

export type PaymentStrategyType = 'grace_float' | 'avalanche' | 'snowball' | 'cashflow_buffer';

export type PaymentMode = 'credit_card' | 'bnpl' | 'cash';
export type RepaymentStructure = 'lump_sum' | 'split_months';

export type ExpenseCategory = 
  | 'Phone & Mobile'
  | 'Internet & Broadband'
  | 'Utilities (Electricity, Water, IWK)'
  | 'Entertainment & Streaming'
  | 'Retail & Shopping'
  | 'Dining & Groceries' 
  | 'Shopping & Retail' 
  | 'Electronics & Gadgets' 
  | 'Travel & Transit' 
  | 'Home & Utilities' 
  | 'Vehicle & Fuel' 
  | 'Healthcare & Medical' 
  | 'Education' 
  | 'Loan Repayment' 
  | 'Entertainment' 
  | 'Other';

export type SettlementStatus = 'unsettled' | 'settled' | 'converted_to_installment';

export type SettlementMethod = 
  | 'instant_fpx' 
  | 'debit_card' 
  | 'bank_transfer' 
  | 'duitnow_qr' 
  | 'cash_funds';

export interface ExpenseItem {
  id: string;
  accountId: string;
  accountName: string;
  accountType: AccountType;
  paymentMode?: PaymentMode;
  repaymentStructure?: RepaymentStructure;
  splitMonths?: number;
  monthlySplitAmount?: number;
  splitFeeRate?: number;
  linkedInstallmentId?: string;
  title: string;
  merchant?: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  status: SettlementStatus;
  notes?: string;
  ownerName?: string;
  ownerRole?: FamilyRole | 'joint' | 'self' | 'family';
  settledAt?: string;
  settlementMethod?: SettlementMethod;
  settlementReference?: string;
  settledFromAccountId?: string;
  interestAvoidedEstimate?: number;
  convertedInstallmentId?: string;
}

export interface BillAccount {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  color: string;
  totalBalance: number;
  statementBalance: number;
  creditLimit: number;
  apr: number;
  lateFee: number;
  cycleDay: number; // Statement closing date (1-31)
  gracePeriodDays: number; // Interest-free window (e.g. 21, 25, 30 days)
  dueDate: string; // YYYY-MM-DD
  minPayment: number;
  apiSynced: boolean;
  lastSyncedAt: string;
  status: 'active' | 'synced' | 'warning';
  accountNumberMask: string;
  ownerName?: string;
  ownerRole?: FamilyRole | 'joint' | 'self' | 'family';
}

export interface InstallmentPlan {
  id: string;
  accountId: string;
  accountName: string;
  title: string;
  category: 'Electronics' | 'Home & Office' | 'Travel' | 'Fashion' | 'Medical' | 'Groceries' | 'Other';
  totalAmount: number;
  monthlyAmount: number;
  totalTenure: number; // e.g. 3, 6, 12, 24
  remainingTenure: number; // e.g. 2 left
  interestRate: number; // 0% or fee
  startDate: string;
  nextBillingDate: string;
  notes?: string;
  ownerName?: string;
  ownerRole?: FamilyRole | 'joint' | 'self' | 'family';
}

export interface PaymentScheduleItem {
  id: string;
  accountId: string;
  accountName: string;
  accountType: AccountType;
  color: string;
  dueDate: string;
  recommendedPayDate: string;
  amount: number;
  minPayment: number;
  statementBalance: number;
  apr: number;
  lateFee: number;
  daysRemaining: number;
  paymentType: 'full_statement' | 'minimum_due' | 'optimized_partial';
  rationale: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'scheduled' | 'paid';
  interestAvoided: number;
  lateFeeAvoided: number;
  floatDaysGained: number;
}

export interface UserSettings {
  currency: CurrencyCode;
  monthlyIncome: number;
  paycheckSchedule: 'monthly' | 'bi_monthly' | 'weekly';
  paycheckDates: number[]; // e.g. [1, 15] or [28]
  allocatedCashForBills: number;
  alertDaysBeforeDue: number[]; // [7, 3, 1]
  defaultStrategy: PaymentStrategyType;
}

export interface CustomAlert {
  id: string;
  accountId: string;
  accountName: string;
  type: 'due_soon' | 'grace_expiring' | 'high_utilization' | 'installment_finishing' | 'penalty_warning';
  title: string;
  message: string;
  dueDate: string;
  daysRemaining: number;
  severity: 'urgent' | 'warning' | 'info';
  read: boolean;
  actionAmount?: number;
}

export interface MonthlyCashFlowProjection {
  monthKey: string; // "2026-10"
  monthLabel: string; // "Oct 2026"
  income: number;
  revolvingBillsDue: number;
  installmentCommitment: number;
  discretionaryRemaining: number;
  activeInstallmentCount: number;
  categoryBreakdown: Record<string, number>;
}

export interface AIAdvisorResponse {
  executiveSummary: string;
  recommendedSequence: Array<{
    accountName: string;
    recommendedPayDate: string;
    amount: number;
    paymentType: string;
    rationale: string;
    urgency: 'critical' | 'high' | 'medium' | 'low';
  }>;
  cashFlowInsight: string;
  savingsEstimated: string;
  riskAlerts: string[];
}

export type FamilyRole = 'husband' | 'wife' | 'partner' | 'parent' | 'member';

export type UserTier = 'free' | 'pro';

export interface UserTierLimits {
  maxAccounts: number;
  maxStandingInstructions: number;
  monthlyAiConsultations: number;
  monthlyReceiptExtractions: number;
  aiConsultationsUsed: number;
  receiptExtractionsUsed: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  familyRole: FamilyRole;
  householdName: string;
  createdAt: string;
  databaseId: string;
  tier: UserTier;
  tierLimits?: UserTierLimits;
}

export type StandingInstructionFrequency = 'monthly' | 'weekly' | 'bi_weekly' | 'quarterly' | 'yearly';
export type StandingInstructionMethod = 
  | 'bank_standing_instruction' 
  | 'direct_debit_duitnow' 
  | 'auto_card_charge' 
  | 'scheduled_fpx';

export interface StandingInstruction {
  id: string;
  title: string;
  billerOrRecipient: string;
  amount: number;
  frequency: StandingInstructionFrequency;
  executionDay: number; // 1-31 (day of month)
  sourceAccountId: string; // ID of linked bank or card account
  sourceAccountName: string;
  method: StandingInstructionMethod;
  category: ExpenseCategory;
  isActive: boolean;
  autoExecuted: boolean;
  startDate: string;
  endDate?: string;
  nextExecutionDate: string; // YYYY-MM-DD
  referenceNumber?: string;
  notes?: string;
  ownerName?: string;
  ownerRole?: FamilyRole | 'joint' | 'self' | 'family';
  lastExecutedAt?: string;
  createdAt?: string;
}

export interface ExtractedReceiptData {
  merchant: string;
  amount: number;
  date: string;
  category: ExpenseCategory;
  referenceNumber?: string;
  taxAmount?: number;
  lineItems?: Array<{ description: string; price: number }>;
  suggestedPaymentMode?: PaymentMode;
  confidenceScore?: number;
  notes?: string;
}

export interface UserDedicatedDatabase {
  databaseId: string;
  userId: string;
  userEmail: string;
  lastUpdated: string;
  version: number;
  accounts: BillAccount[];
  installments: InstallmentPlan[];
  expenses?: ExpenseItem[];
  standingInstructions?: StandingInstruction[];
  settings: UserSettings;
  paidScheduleIds: string[];
  scheduledScheduleIds: string[];
  alertThresholds: number[];
}

export interface FamilySyncPackage {
  format: 'billflow-family-sync';
  version: number;
  exportedAt: string;
  checksum: string;
  exportedBy: {
    userId: string;
    userName: string;
    userEmail: string;
    familyRole: FamilyRole;
    householdName: string;
  };
  data: {
    accounts: BillAccount[];
    installments: InstallmentPlan[];
    expenses?: ExpenseItem[];
    settings?: Partial<UserSettings>;
  };
  summary: {
    totalAccounts: number;
    totalInstallments: number;
    totalExpenses?: number;
    totalDebt: number;
    totalMonthlyInstallments: number;
  };
}

