import { 
  BillAccount, 
  UtilityBillItem, 
  UtilityBillRecommendation, 
  UserSettings, 
  BenefitType, 
  AccountType 
} from '../types';
import { 
  getTodayDateStr, 
  getDaysDifference, 
  parseDateOnly, 
  getUserTimezone 
} from './timezone';

const HIGH_YIELD_ANNUAL_RATE = 0.035; // 3.5% annual return on liquid bank float

/**
 * Returns day-of-week string (e.g. "Saturday", "Monday") for YYYY-MM-DD in UTC.
 */
function getDayOfWeekName(dateStr: string): string {
  const ts = parseDateOnly(dateStr);
  const d = new Date(ts);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[d.getUTCDay()];
}

/**
 * Checks if a given YYYY-MM-DD date is a Saturday or Sunday.
 */
function isWeekendDate(dateStr: string): boolean {
  const ts = parseDateOnly(dateStr);
  const d = new Date(ts);
  const day = d.getUTCDay();
  return day === 0 || day === 6; // 0 = Sun, 6 = Sat
}

/**
 * Formats a Date object to YYYY-MM-DD.
 */
function formatDateToISO(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Adds N calendar days to a date string YYYY-MM-DD.
 */
function addDaysToDateStr(dateStr: string, daysToAdd: number): string {
  const ts = parseDateOnly(dateStr);
  const d = new Date(ts + daysToAdd * 24 * 60 * 60 * 1000);
  return formatDateToISO(d);
}

/**
 * Calculates the next statement cutoff date (cycleDay) and statement due date (grace period)
 * given a transaction execution date.
 */
function calculateStatementDates(
  transactionDateStr: string,
  cycleDay: number,
  gracePeriodDays: number
): { statementCutoffDate: string; statementDueDate: string; floatDays: number } {
  const clean = transactionDateStr.split('T')[0];
  const [y, m, d] = clean.split('-').map(Number);

  let cutoffYear = y;
  let cutoffMonth = m; // 1-12

  // If the transaction happens AFTER or ON the cycle cutoff day,
  // it gets billed in the NEXT month's cycle statement.
  if (d > cycleDay) {
    cutoffMonth += 1;
    if (cutoffMonth > 12) {
      cutoffMonth = 1;
      cutoffYear += 1;
    }
  }

  // Determine actual days in cutoff month
  const daysInCutoffMonth = new Date(Date.UTC(cutoffYear, cutoffMonth, 0)).getUTCDate();
  const actualCycleDay = Math.min(cycleDay, daysInCutoffMonth);
  const cutoffDate = new Date(Date.UTC(cutoffYear, cutoffMonth - 1, actualCycleDay));
  const statementCutoffDate = formatDateToISO(cutoffDate);

  // Statement due date = statementCutoffDate + gracePeriodDays
  const dueDate = new Date(cutoffDate.getTime() + (gracePeriodDays || 20) * 24 * 60 * 60 * 1000);
  const statementDueDate = formatDateToISO(dueDate);

  // Float days = difference from transactionDateStr to statementDueDate
  const floatDays = Math.max(1, getDaysDifference(statementDueDate, transactionDateStr));

  return {
    statementCutoffDate,
    statementDueDate,
    floatDays,
  };
}

/**
 * Analyzes candidate payment dates for a bill to maximize weekend cashback or float.
 */
function determineOptimalPayDate(
  billDueDate: string,
  todayStr: string,
  account: BillAccount
): { optimalDate: string; isWeekendOptimized: boolean } {
  // If bill is already overdue or due today, must pay today
  if (getDaysDifference(billDueDate, todayStr) <= 0) {
    return { optimalDate: todayStr, isWeekendOptimized: isWeekendDate(todayStr) };
  }

  // Check if account has a weekend-specific benefit (like Maybank AMEX 5% weekend cashback)
  const hasWeekendBenefit = (account.rewardBenefits || []).some(
    (b) => b.dayCondition === 'weekends'
  );

  const daysToDue = getDaysDifference(billDueDate, todayStr);

  // If account rewards weekends, search backwards from billDueDate for the nearest weekend date
  // that is still >= todayStr
  if (hasWeekendBenefit) {
    for (let offset = 0; offset <= Math.min(daysToDue, 6); offset++) {
      const candidate = addDaysToDateStr(billDueDate, -offset);
      if (getDaysDifference(candidate, todayStr) >= 0 && isWeekendDate(candidate)) {
        return { optimalDate: candidate, isWeekendOptimized: true };
      }
    }
  }

  // Otherwise, default to 1-2 days before billDueDate to ensure safety and retain bank cash
  const safePayDate = daysToDue >= 2 ? addDaysToDateStr(billDueDate, -1) : billDueDate;
  return { optimalDate: safePayDate, isWeekendOptimized: isWeekendDate(safePayDate) };
}

/**
 * Generates tailored payment acceptance and portal tips for billers.
 */
function getBillerAcceptanceTip(billerName: string, account: BillAccount): string {
  const bLower = billerName.toLowerCase();
  const accNameLower = account.name.toLowerCase();
  const isAmex = accNameLower.includes('amex') || accNameLower.includes('american express');
  const isSPayLater = account.type === 'ewallet_pay_later' && accNameLower.includes('spay');
  const isGrab = account.type === 'ewallet_pay_later' && accNameLower.includes('grab');

  if (isSPayLater) {
    return 'Pay via Shopee App > "Prepaid, Bills & Tickets" to use SPayLater directly. Select 1-Month tenure for 0% interest and coins booster.';
  }

  if (isGrab) {
    return 'Pay via Grab App > "Bills" using GrabPay Later to collect 3x GrabRewards points with automatic deduction on next month’s statement.';
  }

  if (isAmex) {
    if (bLower.includes('tnb') || bLower.includes('tenaga')) {
      return 'TNB myTNB portal only accepts Visa/Mastercard directly. To capture 5% AMEX Weekend Cashback: pay via Shopee App Bills or reload Boost/Grab using AMEX on Saturday/Sunday!';
    }
    if (bLower.includes('selangor') || bLower.includes('water')) {
      return 'Air Selangor app supports direct Visa/Mastercard. For AMEX 5% cashback, pay via JomPAY on Maybank2u web or via Shopee Bills on weekend.';
    }
    return 'Verify if biller accepts AMEX directly. If not, pay via Shopee Bills, Grab e-wallet reload, or Maybank2u JomPAY on Saturday/Sunday.';
  }

  // Standard Visa / Mastercard
  if (bLower.includes('unifi') || bLower.includes('tm')) {
    return 'Pay via myUnifi app or TM JomPAY. Set up Auto-Debit with this card to avoid broadband service disruptions.';
  }

  if (bLower.includes('maxis') || bLower.includes('celcom') || bLower.includes('digi')) {
    return 'Supports 1-click credit card payment on telco app or JomPAY. Auto-billing qualifies for monthly data bonuses on select plans.';
  }

  return 'Pay directly on provider mobile portal or via JomPAY using this card to earn reward points and maximize interest-free grace float.';
}

/**
 * Analyzes a single utility bill against all available accounts and returns an optimal recommendation.
 */
export function adviseUtilityBillPayment(
  bill: UtilityBillItem,
  accounts: BillAccount[],
  settings?: UserSettings,
  userTimezone?: string
): UtilityBillRecommendation {
  const tz = userTimezone || getUserTimezone(settings);
  const todayStr = getTodayDateStr(tz);
  const daysRemaining = getDaysDifference(bill.dueDate, todayStr);

  // Eligible accounts are credit cards and e-wallet pay later (SPayLater, GrabPay Later, etc.)
  const eligibleAccounts = accounts.filter(
    (a) => a.type === 'credit_card' || a.type === 'ewallet_pay_later'
  );

  // Fallback if no credit accounts exist
  if (eligibleAccounts.length === 0) {
    const fallbackAcc = accounts[0] || {
      id: 'default-acc',
      name: 'Default Payment Method',
      type: 'bank_account' as AccountType,
      color: '#0284c7',
      creditLimit: 0,
      totalBalance: 0,
      cycleDay: 1,
      gracePeriodDays: 0,
    };

    return {
      billId: bill.id,
      billName: bill.billerName,
      category: bill.category,
      amount: bill.amount,
      dueDate: bill.dueDate,
      daysRemaining,
      recommendedAccountId: fallbackAcc.id,
      recommendedAccountName: fallbackAcc.name,
      recommendedAccountType: fallbackAcc.type,
      recommendedAccountColor: fallbackAcc.color,
      recommendedPayDate: bill.dueDate,
      recommendedPayDayOfWeek: getDayOfWeekName(bill.dueDate),
      floatDaysGained: 0,
      statementCutoffDate: bill.dueDate,
      statementDueDate: bill.dueDate,
      projectedBenefit: {
        type: 'points',
        title: 'Direct Bank Settlement',
        monetaryValue: 0,
        unitDescription: 'No cashback',
        description: 'No active credit card or SPayLater accounts found.',
      },
      bankInterestEarnedEstimate: 0,
      totalAdvantageValue: 0,
      reasons: ['No credit card or pay later accounts linked. Direct cash settlement recommended.'],
      acceptanceTips: 'Link a credit card or SPayLater account to unlock up to 55 days of free float and cashback rewards.',
      availableCredit: 0,
      isCreditAdequate: true,
    };
  }

  // Score each account
  const scoredAccounts = eligibleAccounts.map((account) => {
    const availableCredit = Math.max(0, (account.creditLimit || 0) - (account.totalBalance || 0));
    const isCreditAdequate = account.creditLimit > 0 ? availableCredit >= bill.amount : true;

    // Determine optimal payment date
    const { optimalDate, isWeekendOptimized } = determineOptimalPayDate(bill.dueDate, todayStr, account);

    // Calculate float timing
    const { statementCutoffDate, statementDueDate, floatDays } = calculateStatementDates(
      optimalDate,
      account.cycleDay || 1,
      account.gracePeriodDays || 20
    );

    // Calculate benefits / rewards
    let benefitType: BenefitType = 'points';
    let benefitTitle = 'Standard Rewards';
    let ratePercent = 0;
    let monetaryValue = 0;
    let unitDescription = '0 points';
    let description = '';

    const benefits = account.rewardBenefits || [];
    let matchedBenefit = benefits.find(
      (b) => b.categoryCondition === 'utilities' || b.categoryCondition === 'all'
    );

    const isWeekend = isWeekendDate(optimalDate);

    // If AMEX weekend cashback applies
    const weekendCashback = benefits.find((b) => b.dayCondition === 'weekends' && b.type === 'cashback');
    if (weekendCashback && isWeekend) {
      matchedBenefit = weekendCashback;
    }

    if (matchedBenefit) {
      benefitType = matchedBenefit.type;
      benefitTitle = matchedBenefit.name;

      if (matchedBenefit.type === 'cashback') {
        ratePercent = matchedBenefit.ratePercent || 5;
        monetaryValue = Math.min((bill.amount * ratePercent) / 100, matchedBenefit.monthlyCap || 50);
        unitDescription = `${ratePercent}% Cashback`;
        description = `${ratePercent}% Cashback (${isWeekend ? 'Weekend special' : 'All transactions'})`;
      } else if (matchedBenefit.type === 'coins') {
        const coins = Math.round(bill.amount * (matchedBenefit.coinsPerUnit || 10));
        monetaryValue = coins * 0.01; // 1 coin = 1 cent
        unitDescription = `${coins.toLocaleString()} Shopee Coins`;
        description = `Earn ~${coins} coins redeemable for future Shopee/SPayLater checkouts`;
      } else if (matchedBenefit.type === 'points') {
        const mult = matchedBenefit.pointsMultiplier || 3;
        const pts = Math.round(bill.amount * mult);
        monetaryValue = pts * 0.005; // 200 pts ~ RM1
        unitDescription = `${pts.toLocaleString()} Points (${mult}x)`;
        description = `${mult}x rewards points on utility bill payments`;
      }
    } else {
      // Default heuristic based on account type
      if (account.name.toLowerCase().includes('spaylater')) {
        benefitType = 'coins';
        benefitTitle = 'SPayLater Utility Coins';
        const coins = Math.round(bill.amount * 5);
        monetaryValue = coins * 0.01;
        unitDescription = `${coins} Coins`;
        description = '0% interest 1-month tenure with Shopee Coins rebate';
      } else if (account.name.toLowerCase().includes('grab')) {
        benefitType = 'points';
        benefitTitle = 'GrabRewards on Bills';
        const pts = Math.round(bill.amount * 3);
        monetaryValue = pts * 0.005;
        unitDescription = `${pts} GrabPoints`;
        description = '3x GrabPoints on recurring utilities with 0% markup';
      } else {
        benefitType = 'points';
        benefitTitle = 'Card Rewards';
        const pts = Math.round(bill.amount * 1);
        monetaryValue = pts * 0.002;
        unitDescription = `${pts} TreatsPoints`;
        description = '1x point per RM1 spent';
      }
    }

    // High-yield bank float interest earned
    const bankInterestEarnedEstimate = Math.round(
      bill.amount * (HIGH_YIELD_ANNUAL_RATE / 365) * floatDays * 100
    ) / 100;

    const totalAdvantageValue = Math.round((monetaryValue + bankInterestEarnedEstimate) * 100) / 100;

    // Score calculation
    // Priority: Available credit > Benefit value > Float duration > Bank interest
    let score = totalAdvantageValue * 10 + floatDays * 0.5;
    if (!isCreditAdequate) score -= 1000;
    if (isWeekendOptimized && matchedBenefit?.dayCondition === 'weekends') score += 15;

    // Detailed reasons
    const reasons: string[] = [];
    reasons.push(
      `Enjoy ${floatDays} days of interest-free float (statement cuts ${statementCutoffDate}, payment due ${statementDueDate}).`
    );

    if (monetaryValue > 0) {
      reasons.push(
        `Earns ${unitDescription} worth ~RM ${monetaryValue.toFixed(2)} in financial perks.`
      );
    }

    if (isWeekendOptimized) {
      reasons.push(
        `Scheduled for ${getDayOfWeekName(optimalDate)} (${optimalDate}) to unlock weekend rewards rate.`
      );
    } else {
      reasons.push(
        `Scheduled for ${optimalDate} (${getDayOfWeekName(optimalDate)}), keeping cash in your bank until 1 day before the bill deadline.`
      );
    }

    reasons.push(
      `Cash retained in your high-yield savings generates ~RM ${bankInterestEarnedEstimate.toFixed(2)} in passive bank interest.`
    );

    const acceptanceTips = getBillerAcceptanceTip(bill.billerName, account);

    return {
      account,
      availableCredit,
      isCreditAdequate,
      optimalDate,
      floatDays,
      statementCutoffDate,
      statementDueDate,
      benefitType,
      benefitTitle,
      ratePercent,
      monetaryValue,
      unitDescription,
      description,
      bankInterestEarnedEstimate,
      totalAdvantageValue,
      score,
      reasons,
      acceptanceTips,
    };
  });

  // Sort by highest score descending
  scoredAccounts.sort((a, b) => b.score - a.score);

  const best = scoredAccounts[0];
  const runnerUpCandidate = scoredAccounts[1];

  let runnerUp: UtilityBillRecommendation['runnerUp'] | undefined;
  if (runnerUpCandidate && runnerUpCandidate.isCreditAdequate) {
    runnerUp = {
      accountId: runnerUpCandidate.account.id,
      accountName: runnerUpCandidate.account.name,
      accountType: runnerUpCandidate.account.type,
      color: runnerUpCandidate.account.color,
      floatDays: runnerUpCandidate.floatDays,
      benefitValue: runnerUpCandidate.monetaryValue,
      benefitTitle: runnerUpCandidate.benefitTitle,
      reason: `${runnerUpCandidate.floatDays} days float with ${runnerUpCandidate.unitDescription}`,
    };
  }

  return {
    billId: bill.id,
    billName: bill.billerName,
    category: bill.category,
    amount: bill.amount,
    dueDate: bill.dueDate,
    daysRemaining,
    recommendedAccountId: best.account.id,
    recommendedAccountName: best.account.name,
    recommendedAccountType: best.account.type,
    recommendedAccountColor: best.account.color,
    recommendedPayDate: best.optimalDate,
    recommendedPayDayOfWeek: getDayOfWeekName(best.optimalDate),
    floatDaysGained: best.floatDays,
    statementCutoffDate: best.statementCutoffDate,
    statementDueDate: best.statementDueDate,
    projectedBenefit: {
      type: best.benefitType,
      title: best.benefitTitle,
      ratePercent: best.ratePercent,
      monetaryValue: best.monetaryValue,
      unitDescription: best.unitDescription,
      description: best.description,
    },
    bankInterestEarnedEstimate: best.bankInterestEarnedEstimate,
    totalAdvantageValue: best.totalAdvantageValue,
    reasons: best.reasons,
    runnerUp,
    acceptanceTips: best.acceptanceTips,
    availableCredit: best.availableCredit,
    isCreditAdequate: best.isCreditAdequate,
  };
}

/**
 * Analyzes an entire portfolio of upcoming utility bills and returns comprehensive recommendations and metrics.
 */
export function analyzeAllUtilityBills(
  bills: UtilityBillItem[],
  accounts: BillAccount[],
  settings?: UserSettings,
  userTimezone?: string
): {
  recommendations: UtilityBillRecommendation[];
  summary: {
    totalBillsAmount: number;
    pendingBillsAmount: number;
    paidBillsAmount: number;
    totalBillsCount: number;
    pendingCount: number;
    paidCount: number;
    totalProjectedRewards: number;
    averageFloatDays: number;
    totalBankInterestFloatBenefit: number;
    totalFinancialAdvantage: number;
    optimalPaymentSchedule: {
      date: string;
      dayOfWeek: string;
      billName: string;
      accountName: string;
      amount: number;
      floatDays: number;
      benefitDescription: string;
    }[];
  };
} {
  const recommendations = bills.map((bill) =>
    adviseUtilityBillPayment(bill, accounts, settings, userTimezone)
  );

  let totalBillsAmount = 0;
  let pendingBillsAmount = 0;
  let paidBillsAmount = 0;
  let pendingCount = 0;
  let paidCount = 0;
  let totalProjectedRewards = 0;
  let totalFloatDays = 0;
  let totalBankInterestFloatBenefit = 0;

  recommendations.forEach((rec, idx) => {
    const bill = bills[idx];
    totalBillsAmount += bill.amount;

    if (bill.status === 'paid') {
      paidBillsAmount += bill.amount;
      paidCount += 1;
    } else {
      pendingBillsAmount += bill.amount;
      pendingCount += 1;
      totalProjectedRewards += rec.projectedBenefit.monetaryValue;
      totalFloatDays += rec.floatDaysGained;
      totalBankInterestFloatBenefit += rec.bankInterestEarnedEstimate;
    }
  });

  const averageFloatDays =
    pendingCount > 0 ? Math.round((totalFloatDays / pendingCount) * 10) / 10 : 0;
  const totalFinancialAdvantage =
    Math.round((totalProjectedRewards + totalBankInterestFloatBenefit) * 100) / 100;

  // Build sorted timeline of upcoming payment dates
  const optimalPaymentSchedule = recommendations
    .filter((r, idx) => bills[idx].status !== 'paid')
    .map((r) => ({
      date: r.recommendedPayDate,
      dayOfWeek: r.recommendedPayDayOfWeek,
      billName: r.billName,
      accountName: r.recommendedAccountName,
      amount: r.amount,
      floatDays: r.floatDaysGained,
      benefitDescription: r.projectedBenefit.unitDescription,
    }))
    .sort((a, b) => parseDateOnly(a.date) - parseDateOnly(b.date));

  return {
    recommendations,
    summary: {
      totalBillsAmount,
      pendingBillsAmount,
      paidBillsAmount,
      totalBillsCount: bills.length,
      pendingCount,
      paidCount,
      totalProjectedRewards: Math.round(totalProjectedRewards * 100) / 100,
      averageFloatDays,
      totalBankInterestFloatBenefit: Math.round(totalBankInterestFloatBenefit * 100) / 100,
      totalFinancialAdvantage,
      optimalPaymentSchedule,
    },
  };
}
