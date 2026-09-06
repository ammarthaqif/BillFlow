export type AccountType = 'credit_card' | 'ewallet_pay_later' | 'bank_account';

export type PaymentStrategyType = 'grace_float' | 'avalanche' | 'snowball' | 'cashflow_buffer';

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
