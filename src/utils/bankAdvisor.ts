import { 
  BillAccount, 
  UserSettings, 
  StandingInstruction, 
  BankScheduledTransaction, 
  BankSettlementAdvice 
} from '../types';
import { formatCurrency, CurrencyCode } from './currency';

/**
 * Returns a recommended settlement date (typically 2-3 days before the statement due date)
 * to ensure ACH/FPX/clearing buffer while maximizing interest-free cash float.
 */
export function getRecommendedSettlementDate(dueDateStr: string, bufferDays: number = 2): string {
  try {
    const due = new Date(dueDateStr);
    const rec = new Date(due);
    rec.setDate(rec.getDate() - bufferDays);
    return rec.toISOString().split('T')[0];
  } catch {
    return dueDateStr;
  }
}

/**
 * Calculates day difference between two YYYY-MM-DD dates
 */
export function getDaysBetween(dateA: string, dateB: string): number {
  const d1 = new Date(dateA);
  const d2 = new Date(dateB);
  const diff = d2.getTime() - d1.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Generates dates for incoming paychecks between referenceDate and targetDate
 */
export function getIncomingPaychecksInWindow(
  referenceDateStr: string,
  targetDateStr: string,
  settings: UserSettings
): Array<{ date: string; amount: number; description: string }> {
  const refDate = new Date(referenceDateStr);
  const targetDate = new Date(targetDateStr);
  
  if (targetDate < refDate) return [];

  const results: Array<{ date: string; amount: number; description: string }> = [];
  const monthlyIncome = settings.monthlyIncome || 0;
  const schedule = settings.paycheckSchedule || 'bi_monthly';
  const dates = settings.paycheckDates && settings.paycheckDates.length > 0 ? settings.paycheckDates : [1, 15];

  let amountPerDrop = monthlyIncome;
  if (schedule === 'bi_monthly') {
    amountPerDrop = Math.round((monthlyIncome / Math.max(1, dates.length)) * 100) / 100;
  } else if (schedule === 'weekly') {
    amountPerDrop = Math.round((monthlyIncome / 4) * 100) / 100;
  }

  // Iterate day by day in window
  const current = new Date(refDate);
  // Start from next day or same day depending on settlement
  while (current <= targetDate) {
    const dayOfMonth = current.getDate();
    const isPayDay = dates.includes(dayOfMonth);
    const dateStr = current.toISOString().split('T')[0];

    if (isPayDay) {
      results.push({
        date: dateStr,
        amount: amountPerDrop,
        description: `Scheduled Paycheck Deposit (${schedule.replace('_', '-')} schedule)`,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return results;
}

/**
 * Calculates the required bank balance and detailed liquidity breakdown
 * needed to settle a specific credit card statement or BNPL prior to its due date.
 */
export function calculateBankSettlementAdvice(
  targetAccount: BillAccount,
  bankAccount: BillAccount,
  settings: UserSettings,
  standingInstructions: StandingInstruction[] = [],
  scheduledTransactions: BankScheduledTransaction[] = [],
  targetSettlementDateStr?: string,
  settlementType: 'full_statement' | 'minimum_due' | 'custom' = 'full_statement',
  customAmount?: number,
  referenceDateStr: string = '2026-10-01'
): BankSettlementAdvice {
  const currency: CurrencyCode = settings.currency || 'MYR';
  const safetyBuffer = settings.safetyBufferAmount ?? 300;

  // Determine amount to settle
  let amountToSettle = targetAccount.statementBalance;
  if (settlementType === 'minimum_due') {
    amountToSettle = Math.min(targetAccount.minPayment, targetAccount.statementBalance);
  } else if (settlementType === 'custom' && customAmount !== undefined && customAmount > 0) {
    amountToSettle = customAmount;
  }

  // Determine target settlement date (default to 2 days prior to due date)
  const targetSettlementDate = targetSettlementDateStr || getRecommendedSettlementDate(targetAccount.dueDate, 2);
  const daysPriorToDueDate = getDaysBetween(targetSettlementDate, targetAccount.dueDate);

  // 1. Calculate incoming paychecks credited to the bank before or on the settlement date
  const incomingPaychecks = getIncomingPaychecksInWindow(referenceDateStr, targetSettlementDate, settings);
  const incomingPaychecksAmount = incomingPaychecks.reduce((sum, p) => sum + p.amount, 0);

  // 2. Calculate committed outflows from this bank account before or on the settlement date
  // A) Active Standing Instructions from this bank account
  const committedSIOutflows: Array<{ date: string; amount: number; title: string }> = [];
  standingInstructions.forEach((si) => {
    if (si.isActive && si.sourceAccountId === bankAccount.id) {
      // Don't double count if it's already an instruction to this exact target account
      if (si.id !== targetAccount.id) {
        const nextExecDate = si.nextExecutionDate;
        if (nextExecDate && nextExecDate >= referenceDateStr && nextExecDate <= targetSettlementDate) {
          committedSIOutflows.push({
            date: nextExecDate,
            amount: si.amount,
            title: `Standing Auto-Debit: ${si.title}`,
          });
        }
      }
    }
  });

  // B) Other pending scheduled bank transactions from this bank account
  const committedTxOutflows: Array<{ date: string; amount: number; title: string }> = [];
  scheduledTransactions.forEach((tx) => {
    if (
      tx.status === 'pending' &&
      tx.sourceBankAccountId === bankAccount.id &&
      tx.targetAccountId !== targetAccount.id &&
      tx.scheduledDate >= referenceDateStr &&
      tx.scheduledDate <= targetSettlementDate
    ) {
      committedTxOutflows.push({
        date: tx.scheduledDate,
        amount: tx.amount,
        title: `Scheduled Transfer: ${tx.title}`,
      });
    }
  });

  const allOutflows = [...committedSIOutflows, ...committedTxOutflows];
  const committedOutflowsAmount = allOutflows.reduce((sum, o) => sum + o.amount, 0);

  // Current balance of the funding bank account
  const currentBankBalance = bankAccount.totalBalance;

  // Projected available liquidity in bank right before the statement settlement deduction
  const projectedAvailableBeforeSettlement = currentBankBalance + incomingPaychecksAmount - committedOutflowsAmount;

  // The MINIMUM bank balance required TODAY to cover committed outflows + this statement settlement
  // Formula: Required Balance Today = max(0, amountToSettle + committedOutflowsAmount - incomingPaychecksAmount)
  const requiredBankBalanceToday = Math.max(0, Math.round((amountToSettle + committedOutflowsAmount - incomingPaychecksAmount) * 100) / 100);
  const requiredSafeBalanceWithBuffer = Math.round((requiredBankBalanceToday + safetyBuffer) * 100) / 100;

  // Net position today
  const netPosition = Math.round((currentBankBalance - requiredBankBalanceToday) * 100) / 100;
  const postSettlementRemainingBuffer = Math.round((projectedAvailableBeforeSettlement - amountToSettle) * 100) / 100;

  let status: 'sufficient' | 'shortfall' | 'tight_buffer' = 'sufficient';
  let shortfallAmount = 0;

  if (netPosition < 0) {
    status = 'shortfall';
    shortfallAmount = Math.abs(netPosition);
  } else if (postSettlementRemainingBuffer < safetyBuffer) {
    status = 'tight_buffer';
  }

  // 3. Build step-by-step chronological cash timeline ledger
  interface TimelineEvent {
    date: string;
    title: string;
    type: 'current_balance' | 'paycheck_inflow' | 'committed_outflow' | 'target_settlement';
    amount: number;
    description: string;
  }

  const events: TimelineEvent[] = [];

  incomingPaychecks.forEach((p) => {
    events.push({
      date: p.date,
      title: p.description,
      type: 'paycheck_inflow',
      amount: p.amount,
      description: `Income credited into ${bankAccount.name}`,
    });
  });

  allOutflows.forEach((o) => {
    events.push({
      date: o.date,
      title: o.title,
      type: 'committed_outflow',
      amount: -o.amount,
      description: `Auto-deduction from ${bankAccount.name}`,
    });
  });

  // Sort events chronologically
  events.sort((a, b) => a.date.localeCompare(b.date));

  // Running balance array
  let running = currentBankBalance;
  const timeline: BankSettlementAdvice['timeline'] = [
    {
      date: referenceDateStr,
      title: `Starting Bank Balance (${bankAccount.name})`,
      type: 'current_balance',
      amount: currentBankBalance,
      runningBalance: running,
      description: `Current verified liquid balance in ${bankAccount.institution}`,
    },
  ];

  events.forEach((ev) => {
    running = Math.round((running + ev.amount) * 100) / 100;
    timeline.push({
      date: ev.date,
      title: ev.title,
      type: ev.type,
      amount: ev.amount,
      runningBalance: running,
      description: ev.description,
    });
  });

  // Finally, statement settlement event on targetSettlementDate
  running = Math.round((running - amountToSettle) * 100) / 100;
  timeline.push({
    date: targetSettlementDate,
    title: `Settle ${targetAccount.name} Statement (${settlementType === 'full_statement' ? 'Full Balance' : 'Payment'})`,
    type: 'target_settlement',
    amount: -amountToSettle,
    runningBalance: running,
    description: `Discharge statement prior to ${targetAccount.dueDate} due date (${daysPriorToDueDate} days early)`,
  });

  // 4. Generate intelligent actionable recommendations
  const recommendations: BankSettlementAdvice['recommendations'] = [];

  if (status === 'sufficient') {
    recommendations.push({
      type: 'positive',
      text: `Your current bank balance of ${formatCurrency(currentBankBalance, currency)} is fully sufficient. Settle on ${targetSettlementDate} (${daysPriorToDueDate} days prior to due date) to lock in 0% interest with zero late fees.`,
    });
    recommendations.push({
      type: 'tip',
      text: `After settling this statement and fulfilling ${allOutflows.length} committed debits, your remaining liquid reserve will be ${formatCurrency(postSettlementRemainingBuffer, currency)}, comfortably above your ${formatCurrency(safetyBuffer, currency)} safety threshold.`,
    });
  } else if (status === 'tight_buffer') {
    recommendations.push({
      type: 'warning',
      text: `Sufficient to clear bill, but your projected buffer of ${formatCurrency(postSettlementRemainingBuffer, currency)} is below your preferred safety reserve (${formatCurrency(safetyBuffer, currency)}).`,
    });
    recommendations.push({
      type: 'tip',
      text: `Consider timing your payment right after your next paycheck on day ${settings.paycheckDates?.[0] ?? 1} if the due date permits.`,
    });
  } else {
    // Shortfall
    recommendations.push({
      type: 'warning',
      text: `Liquidity Shortfall: You need ${formatCurrency(requiredBankBalanceToday, currency)} in ${bankAccount.name}, but currently hold ${formatCurrency(currentBankBalance, currency)}. An additional ${formatCurrency(shortfallAmount, currency)} is required before ${targetSettlementDate}.`,
    });
    recommendations.push({
      type: 'action',
      text: `Top-up Strategy: Transfer at least ${formatCurrency(shortfallAmount, currency)} from another account or allocate from your incoming monthly income (${formatCurrency(settings.monthlyIncome, currency)}/mo).`,
    });

    if (amountToSettle > 500) {
      const installment3Mo = Math.round((amountToSettle / 3) * 100) / 100;
      recommendations.push({
        type: 'action',
        text: `Alternative: Convert this ${formatCurrency(amountToSettle, currency)} balance into a 3-month 0% installment plan. This slashes your immediate bank balance requirement by ${formatCurrency(amountToSettle - installment3Mo, currency)} down to just ${formatCurrency(installment3Mo, currency)}/mo.`,
      });
    }

    if (targetAccount.minPayment < amountToSettle) {
      recommendations.push({
        type: 'tip',
        text: `Emergency Fallback: Paying the minimum amount of ${formatCurrency(targetAccount.minPayment, currency)} by ${targetAccount.dueDate} prevents a ${formatCurrency(targetAccount.lateFee, currency)} late penalty while preserving cash until your next paycheck.`,
      });
    }
  }

  return {
    targetAccount,
    bankAccount,
    statementBalance: targetAccount.statementBalance,
    minPayment: targetAccount.minPayment,
    selectedAmountToSettle: amountToSettle,
    targetDueDate: targetAccount.dueDate,
    targetSettlementDate,
    daysPriorToDueDate,
    currentBankBalance,
    incomingPaychecksAmount,
    incomingPaychecksCount: incomingPaychecks.length,
    committedOutflowsAmount,
    committedOutflowsCount: allOutflows.length,
    projectedAvailableBeforeSettlement,
    requiredBankBalanceToday,
    requiredSafeBalanceWithBuffer,
    safetyBufferAmount: safetyBuffer,
    netPosition,
    status,
    shortfallAmount,
    postSettlementRemainingBuffer,
    timeline,
    recommendations,
  };
}

/**
 * Returns a readiness summary table for all cards & BNPL accounts evaluated against a bank account
 */
export function getAllCardsReadinessSummary(
  accounts: BillAccount[] = [],
  bankAccount: BillAccount,
  settings: UserSettings,
  standingInstructions: StandingInstruction[] = [],
  scheduledTransactions: BankScheduledTransaction[] = []
): Array<{
  account: BillAccount;
  statementBalance: number;
  dueDate: string;
  recommendedPayDate: string;
  daysRemaining: number;
  requiredBankBalance: number;
  status: 'sufficient' | 'shortfall' | 'tight_buffer';
  shortfall: number;
  isScheduled: boolean;
}> {
  const cardsAndBnpl = (accounts || []).filter(
    (a) => a.type === 'credit_card' || a.type === 'ewallet_pay_later'
  );

  return cardsAndBnpl.map((acc) => {
    const recPayDate = getRecommendedSettlementDate(acc.dueDate, 2);
    const advice = calculateBankSettlementAdvice(
      acc,
      bankAccount,
      settings,
      standingInstructions,
      scheduledTransactions,
      recPayDate,
      'full_statement'
    );

    const isScheduled = scheduledTransactions.some(
      (tx) => tx.targetAccountId === acc.id && tx.status === 'pending'
    );

    const daysRemaining = getDaysBetween('2026-10-01', acc.dueDate);

    return {
      account: acc,
      statementBalance: acc.statementBalance,
      dueDate: acc.dueDate,
      recommendedPayDate: recPayDate,
      daysRemaining,
      requiredBankBalance: advice.requiredBankBalanceToday,
      status: advice.status,
      shortfall: advice.shortfallAmount,
      isScheduled,
    };
  });
}
