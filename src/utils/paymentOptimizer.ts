import { BillAccount, InstallmentPlan, MonthlyCashFlowProjection, PaymentScheduleItem, PaymentStrategyType, CustomAlert } from '../types';
import { CurrencyCode, formatCurrency } from './currency';
import { 
  getDaysDifference, 
  formatDate, 
  getTodayDateStr, 
  getTodayYearMonth 
} from './timezone';

// Re-export timezone date utilities for backwards compatibility
export { getDaysDifference, formatDate };

/**
 * Calculates optimal payment schedule based on user's strategy and available cash,
 * strictly aligned with the user's timezone.
 */
export function calculatePaymentSchedule(
  accounts: BillAccount[],
  strategy: PaymentStrategyType,
  availableCash: number,
  paycheckDates: number[] = [1, 15],
  timeZone?: string
): PaymentScheduleItem[] {
  const todayStr = getTodayDateStr(timeZone);

  // Only bill/debt accounts need to be paid (exclude liquid bank_account)
  const billAccounts = (accounts || []).filter((a) => a.type !== 'bank_account');

  // Clone bill accounts to avoid mutation
  const sortedAccounts = [...billAccounts];

  // Sort based on strategy
  if (strategy === 'grace_float') {
    // Sequence by:
    // 1) Due Date (earliest first)
    // 2) Penalty severity (late fee + APR)
    sortedAccounts.sort((a, b) => {
      const daysA = getDaysDifference(a.dueDate, todayStr, timeZone);
      const daysB = getDaysDifference(b.dueDate, todayStr, timeZone);
      if (daysA !== daysB) return daysA - daysB;
      // If same due date, higher APR first to save interest
      return b.apr - a.apr;
    });
  } else if (strategy === 'avalanche') {
    // Highest APR first
    sortedAccounts.sort((a, b) => b.apr - a.apr);
  } else if (strategy === 'snowball') {
    // Lowest statement balance first
    sortedAccounts.sort((a, b) => a.statementBalance - b.statementBalance);
  } else if (strategy === 'cashflow_buffer') {
    // Aligns with upcoming paycheck dates
    sortedAccounts.sort((a, b) => {
      const daysA = getDaysDifference(a.dueDate, todayStr, timeZone);
      const daysB = getDaysDifference(b.dueDate, todayStr, timeZone);
      return daysA - daysB;
    });
  }

  // Allocate funds
  let cashRemaining = Math.max(0, availableCash);
  const scheduleItems: PaymentScheduleItem[] = [];

  // Pass 1: Ensure each account gets at least its minimum payment if cash allows
  const allocatedMap = new Map<string, number>();
  sortedAccounts.forEach((acc) => {
    const minNeeded = Math.min(acc.minPayment, acc.statementBalance);
    const minAllocated = Math.min(cashRemaining, minNeeded);
    allocatedMap.set(acc.id, minAllocated);
    cashRemaining -= minAllocated;
  });

  // Pass 2: Distribute remaining cash in sorted strategy order to pay off full statement balance
  sortedAccounts.forEach((acc) => {
    const currentAlloc = allocatedMap.get(acc.id) || 0;
    const remainingStatement = acc.statementBalance - currentAlloc;
    if (remainingStatement > 0 && cashRemaining > 0) {
      const topUp = Math.min(cashRemaining, remainingStatement);
      allocatedMap.set(acc.id, currentAlloc + topUp);
      cashRemaining -= topUp;
    }
  });

  // Build schedule items
  sortedAccounts.forEach((acc) => {
    const daysRemaining = getDaysDifference(acc.dueDate, todayStr, timeZone);
    const allocated = allocatedMap.get(acc.id) || 0;

    let paymentType: 'full_statement' | 'minimum_due' | 'optimized_partial' = 'full_statement';
    if (allocated >= acc.statementBalance) {
      paymentType = 'full_statement';
    } else if (allocated <= acc.minPayment) {
      paymentType = 'minimum_due';
    } else {
      paymentType = 'optimized_partial';
    }

    // Determine recommended payment execution date (1-2 days before due date to maximize float while guaranteeing safety)
    const [dueY, dueM, dueD] = acc.dueDate.split('-').map(Number);
    const dueDateObj = new Date(Date.UTC(dueY, dueM - 1, dueD));
    const recPayDateObj = new Date(dueDateObj);
    recPayDateObj.setUTCDate(recPayDateObj.getUTCDate() - 2); // 2 days buffer for ACH/bank clearing
    const recPayDateStr = recPayDateObj.toISOString().split('T')[0];

    // Calculate savings
    // Monthly interest saved = (allocated / 12) * (acc.apr / 100)
    const monthlyInterestSaved = Math.round(((allocated * (acc.apr / 100)) / 12) * 100) / 100;
    const lateFeeSaved = allocated >= acc.minPayment ? acc.lateFee : 0;
    const floatDays = Math.max(1, acc.gracePeriodDays - 2);

    let urgency: 'critical' | 'high' | 'medium' | 'low' = 'low';
    if (daysRemaining <= 3) urgency = 'critical';
    else if (daysRemaining <= 7) urgency = 'high';
    else if (daysRemaining <= 14) urgency = 'medium';

    let rationale = '';
    if (strategy === 'grace_float') {
      rationale = `Grace period gives ${acc.gracePeriodDays} interest-free days. Schedule payment for ${formatDate(recPayDateStr)} (2 days before due) to maximize cash float while guaranteeing $0 late fee and $0 interest.`;
    } else if (strategy === 'avalanche') {
      rationale = `Carries ${acc.apr}% APR (costing ~${formatCurrency(monthlyInterestSaved, 'MYR')}/mo if unpaid). High-priority avalanche payoff prevents compounded interest drag.`;
    } else if (strategy === 'snowball') {
      rationale = `Balance of ${formatCurrency(acc.statementBalance, 'MYR')} can be cleared quickly to eliminate a monthly bill requirement and build momentum.`;
    } else {
      rationale = `Timed with Paycheck drop on day ${paycheckDates.find((d) => d <= dueD) || paycheckDates[0]} to preserve checking account liquidity buffer.`;
    }

    scheduleItems.push({
      id: `sched-${acc.id}`,
      accountId: acc.id,
      accountName: acc.name,
      accountType: acc.type,
      color: acc.color,
      dueDate: acc.dueDate,
      recommendedPayDate: recPayDateStr,
      amount: allocated,
      minPayment: acc.minPayment,
      statementBalance: acc.statementBalance,
      apr: acc.apr,
      lateFee: acc.lateFee,
      daysRemaining,
      paymentType,
      rationale,
      urgency,
      status: 'pending',
      interestAvoided: monthlyInterestSaved,
      lateFeeAvoided: lateFeeSaved,
      floatDaysGained: floatDays,
    });
  });

  return scheduleItems;
}

/**
 * Generates dynamic alerts based on upcoming cycle deadlines, high utilization, and installments.
 * Accurately calculates days remaining relative to today in the user's active timezone.
 */
export function generateAlerts(
  accounts: BillAccount[], 
  installments: InstallmentPlan[], 
  currency: CurrencyCode = 'MYR',
  timeZone?: string,
  customTodayDateStr?: string
): CustomAlert[] {
  const alerts: CustomAlert[] = [];
  const todayStr = customTodayDateStr || getTodayDateStr(timeZone);

  accounts.forEach((acc) => {
    // Bank accounts are liquid cash deposit accounts, not debt or credit lines
    if (acc.type === 'bank_account') return;

    const days = getDaysDifference(acc.dueDate, todayStr, timeZone);
    const isRevolving = acc.type === 'credit_card' || acc.type === 'ewallet_pay_later';
    const limit = acc.creditLimit || 0;
    const utilization = isRevolving && limit > 0 ? Math.round((acc.totalBalance / limit) * 100) : 0;

    if (days < 0) {
      // Overdue alert
      const overdueDays = Math.abs(days);
      alerts.push({
        id: `alert-due-overdue-${acc.id}`,
        accountId: acc.id,
        accountName: acc.name,
        type: 'due_soon',
        title: `Payment Overdue (${overdueDays} Day${overdueDays === 1 ? '' : 's'})!`,
        message: `${acc.name} was due on ${formatDate(acc.dueDate)}. Immediate settlement of ${formatCurrency(acc.statementBalance, currency)} is required to prevent late fees and interest.`,
        dueDate: acc.dueDate,
        daysRemaining: days,
        severity: 'urgent',
        read: false,
        actionAmount: acc.statementBalance,
      });
    } else if (days <= 3) {
      alerts.push({
        id: `alert-due-urgent-${acc.id}`,
        accountId: acc.id,
        accountName: acc.name,
        type: 'due_soon',
        title: days === 0 ? `Payment Due Today: ${acc.name}!` : `Payment Due in ${days} Day${days === 1 ? '' : 's'}!`,
        message: `${acc.name} due date is ${formatDate(acc.dueDate)}. Pay at least ${formatCurrency(acc.minPayment, currency)} to avoid a ${formatCurrency(acc.lateFee, currency)} late fee.`,
        dueDate: acc.dueDate,
        daysRemaining: days,
        severity: 'urgent',
        read: false,
        actionAmount: acc.statementBalance,
      });
    } else if (days <= 7) {
      alerts.push({
        id: `alert-due-warning-${acc.id}`,
        accountId: acc.id,
        accountName: acc.name,
        type: 'grace_expiring',
        title: `Grace Period Ending: ${acc.name}`,
        message: `Statement balance of ${formatCurrency(acc.statementBalance, currency)} is due in ${days} days (${formatDate(acc.dueDate)}). Clear before grace period expires to pay 0% interest.`,
        dueDate: acc.dueDate,
        daysRemaining: days,
        severity: 'warning',
        read: false,
        actionAmount: acc.statementBalance,
      });
    }

    if (isRevolving && utilization >= 70) {
      alerts.push({
        id: `alert-util-${acc.id}`,
        accountId: acc.id,
        accountName: acc.name,
        type: 'high_utilization',
        title: `High Utilization Alert (${utilization}%)`,
        message: `${acc.name} balance (${formatCurrency(acc.totalBalance, currency)}) is at ${utilization}% of limit (${formatCurrency(limit, currency)}). Paying down lowers credit score impact.`,
        dueDate: acc.dueDate,
        daysRemaining: days,
        severity: 'warning',
        read: false,
        actionAmount: Math.round(acc.totalBalance * 0.4),
      });
    }
  });

  installments.forEach((inst) => {
    const instDays = getDaysDifference(inst.nextBillingDate, todayStr, timeZone);
    if (inst.remainingTenure === 1) {
      alerts.push({
        id: `alert-inst-last-${inst.id}`,
        accountId: inst.accountId,
        accountName: inst.accountName,
        type: 'installment_finishing',
        title: `Final Installment: ${inst.title}`,
        message: `Your final payment of ${formatCurrency(inst.monthlyAmount, currency)} for ${inst.title} is due in ${instDays} days (${formatDate(inst.nextBillingDate)}). Once paid, you free up ${formatCurrency(inst.monthlyAmount, currency)} monthly cash flow!`,
        dueDate: inst.nextBillingDate,
        daysRemaining: instDays,
        severity: 'info',
        read: false,
        actionAmount: inst.monthlyAmount,
      });
    }
  });

  return alerts.sort((a, b) => {
    const sevScore = { urgent: 0, warning: 1, info: 2 };
    return sevScore[a.severity] - sevScore[b.severity] || a.daysRemaining - b.daysRemaining;
  });
}

/**
 * Projects monthly cash flow and installment commitments for the next 6 months
 * starting from the active month in the user's timezone.
 */
export function projectMonthlyCashFlow(
  accounts: BillAccount[],
  installments: InstallmentPlan[],
  monthlyIncome = 6500,
  monthsCount = 6,
  timeZone?: string
): MonthlyCashFlowProjection[] {
  const projections: MonthlyCashFlowProjection[] = [];
  const [currentYear, currentMonth] = getTodayYearMonth(timeZone);

  for (let m = 0; m < monthsCount; m++) {
    // 0-indexed month in Date.UTC
    const targetMonthIndex = (currentMonth - 1) + m;
    const currentMonthDate = new Date(Date.UTC(currentYear, targetMonthIndex, 1));

    const monthKey = currentMonthDate.toISOString().slice(0, 7);
    const monthLabel = currentMonthDate.toLocaleDateString('en-US', { 
      timeZone: 'UTC',
      month: 'short', 
      year: 'numeric' 
    });

    // Active installments in month m
    let totalInstallmentMonth = 0;
    let activeCount = 0;
    const categoryMap: Record<string, number> = {};

    installments.forEach((inst) => {
      // If remaining tenure is >= (m + 1), it is active in this future month
      if (inst.remainingTenure >= m + 1) {
        totalInstallmentMonth += inst.monthlyAmount;
        activeCount++;
        categoryMap[inst.category] = (categoryMap[inst.category] || 0) + inst.monthlyAmount;
      }
    });

    // In month 0, revolving bills due is the full statement balance
    // In future months, estimated baseline revolving spend
    const debtAccounts = accounts.filter((a) => a.type !== 'bank_account');
    const revolvingDue = m === 0 
      ? debtAccounts.reduce((sum, a) => sum + Math.max(0, a.statementBalance - (categoryMap['Total'] || 0)), 0)
      : Math.round(debtAccounts.reduce((sum, a) => sum + a.statementBalance, 0) * (0.85 ** m));

    const totalCommitted = totalInstallmentMonth + revolvingDue;
    const discretionaryRemaining = Math.max(0, monthlyIncome - totalCommitted);

    projections.push({
      monthKey,
      monthLabel,
      income: monthlyIncome,
      revolvingBillsDue: revolvingDue,
      installmentCommitment: Math.round(totalInstallmentMonth * 100) / 100,
      discretionaryRemaining: Math.round(discretionaryRemaining * 100) / 100,
      activeInstallmentCount: activeCount,
      categoryBreakdown: categoryMap,
    });
  }

  return projections;
}
