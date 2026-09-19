import { BillAccount, ExpenseItem, CardRewardBenefit, CardRewardsProgress, CardRecommendation, BenefitType, BenefitCategoryCondition } from '../types';

/**
 * Standard default reward benefit blueprints for popular cards & e-wallets
 * (e.g., Maybank 2 Cards AMEX Weekend 5% Cashback, Shopee SPayLater Coins, Sapphire Preferred, GrabPay Later)
 */
export const DEFAULT_CARD_REWARDS: Record<string, CardRewardBenefit[]> = {
  amex: [
    {
      id: 'reward-amex-weekend',
      name: 'AMEX Weekend 5% Cashback',
      type: 'cashback',
      ratePercent: 5,
      monthlyCap: 50, // RM50 max monthly cashback
      spendToHitCap: 1000, // RM1,000 spend at 5% = RM50
      minSpendToQualify: 0,
      dayCondition: 'weekends',
      categoryCondition: 'all',
      notes: 'Earn 5% cashback on all retail & dining spend every Saturday and Sunday up to RM50/month.',
    },
    {
      id: 'reward-amex-weekday',
      name: '5x TreatsPoints on Weekdays',
      type: 'points',
      pointsMultiplier: 5,
      monthlyCap: 10000,
      spendToHitCap: 2000,
      dayCondition: 'weekdays',
      categoryCondition: 'all',
      notes: 'Earn 5x TreatsPoints per RM1 spent on weekdays.',
    },
  ],
  shopee: [
    {
      id: 'reward-shopee-coins',
      name: 'Shopee 5,000 Coins Booster',
      type: 'coins',
      coinsPerUnit: 10, // 10 coins per RM1 spent
      monthlyCap: 5000, // 5,000 Shopee coins = RM50 value
      spendToHitCap: 500, // RM500 spend hits 5,000 coins cap
      minSpendToQualify: 100,
      dayCondition: 'any',
      categoryCondition: 'shopee',
      notes: 'Earn up to 5,000 Shopee Coins (~RM50) each month on Shopee e-commerce and SPayLater bills.',
    },
  ],
  sapphire: [
    {
      id: 'reward-sapphire-dining',
      name: '3x Rewards on Dining & Groceries',
      type: 'points',
      pointsMultiplier: 3,
      monthlyCap: 15000,
      spendToHitCap: 5000,
      dayCondition: 'any',
      categoryCondition: 'dining',
      notes: 'Earn 3x points on all dining, food deliveries, and supermarket grocery spend.',
    },
    {
      id: 'reward-sapphire-travel',
      name: '2x Travel & Transport Rewards',
      type: 'points',
      pointsMultiplier: 2,
      monthlyCap: 10000,
      spendToHitCap: 5000,
      dayCondition: 'any',
      categoryCondition: 'travel',
      notes: 'Earn 2x points on airlines, hotels, trains, and ride-hailing.',
    },
  ],
  grab: [
    {
      id: 'reward-grab-utilities',
      name: 'GrabRewards 3x Points on Bills',
      type: 'points',
      pointsMultiplier: 3,
      monthlyCap: 6000,
      spendToHitCap: 2000,
      dayCondition: 'any',
      categoryCondition: 'utilities',
      notes: 'Earn 3x GrabRewards points on utility bills and ride hailing.',
    },
  ],
  apple: [
    {
      id: 'reward-apple-cashback',
      name: '2% Daily Cash Unlimited',
      type: 'cashback',
      ratePercent: 2,
      monthlyCap: 100,
      spendToHitCap: 5000,
      dayCondition: 'any',
      categoryCondition: 'all',
      notes: 'Earn 2% instant Daily Cash back on purchases made via contactless Apple Pay.',
    },
  ],
};

/**
 * Resolves the rewards configuration for any given account.
 * Uses account.rewardBenefits if provided, or infers standard Malaysian card perks by name/institution.
 */
export function getAccountRewards(account: BillAccount): CardRewardBenefit[] {
  if (account.rewardBenefits && account.rewardBenefits.length > 0) {
    return account.rewardBenefits;
  }

  const name = (account.name || '').toLowerCase();
  const inst = (account.institution || '').toLowerCase();

  if (name.includes('amex') || name.includes('american express') || inst.includes('american express')) {
    return DEFAULT_CARD_REWARDS.amex;
  }
  if (name.includes('shopee') || name.includes('spaylater') || inst.includes('seamoney')) {
    return DEFAULT_CARD_REWARDS.shopee;
  }
  if (name.includes('sapphire') || name.includes('chase') || name.includes('rewards')) {
    return DEFAULT_CARD_REWARDS.sapphire;
  }
  if (name.includes('grab') || inst.includes('grab')) {
    return DEFAULT_CARD_REWARDS.grab;
  }
  if (name.includes('apple')) {
    return DEFAULT_CARD_REWARDS.apple;
  }

  // Generic fallback: 1% base cashback up to RM30 for credit cards
  if (account.type === 'credit_card') {
    return [
      {
        id: `generic-card-${account.id}`,
        name: '1% Standard Card Cashback',
        type: 'cashback',
        ratePercent: 1,
        monthlyCap: 30,
        spendToHitCap: 3000,
        dayCondition: 'any',
        categoryCondition: 'all',
        notes: '1% base cash rebate on eligible retail spend up to RM30 per monthly cycle.',
      },
    ];
  }

  return [];
}

/**
 * Checks if a given YYYY-MM-DD date falls on a weekend (Saturday or Sunday)
 */
export function isDateWeekend(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Checks if an expense category matches a benefit's category condition
 */
export function matchesCategoryCondition(expenseCategory: string, condition: BenefitCategoryCondition): boolean {
  if (condition === 'all') return true;

  const cat = (expenseCategory || '').toLowerCase();
  switch (condition) {
    case 'online':
      return cat.includes('online') || cat.includes('shopee') || cat.includes('ecommerce') || cat.includes('internet');
    case 'shopee':
      return cat.includes('shopee') || cat.includes('ecommerce') || cat.includes('online') || cat.includes('retail');
    case 'dining':
      return cat.includes('dining') || cat.includes('food') || cat.includes('restaurant') || cat.includes('cafe');
    case 'groceries':
      return cat.includes('groceries') || cat.includes('supermarket') || cat.includes('market');
    case 'utilities':
      return cat.includes('utilities') || cat.includes('electricity') || cat.includes('water') || cat.includes('broadband') || cat.includes('telco') || cat.includes('phone');
    case 'petrol':
      return cat.includes('petrol') || cat.includes('fuel') || cat.includes('gas');
    case 'travel':
      return cat.includes('travel') || cat.includes('flight') || cat.includes('hotel') || cat.includes('transport');
    case 'retail':
      return cat.includes('retail') || cat.includes('shopping') || cat.includes('fashion') || cat.includes('electronics');
    default:
      return true;
  }
}

/**
 * Converts rewards units to an estimated monetary value in Malaysian Ringgit (MYR/RM)
 * - Cashback: 1 : 1
 * - Shopee Coins: 100 coins = RM1.00
 * - Points: 500 points ~ RM1.00 (standard bank reward catalog rate)
 */
export function convertRewardToMonetaryValue(type: BenefitType, amount: number): number {
  switch (type) {
    case 'cashback':
      return amount;
    case 'coins':
      return amount / 100; // 5,000 coins = RM50
    case 'points':
    case 'miles':
      return amount * 0.002; // 5,000 points = RM10
    default:
      return amount;
  }
}

/**
 * Calculates current month rewards progress across all accounts based on recorded expenses
 */
export function calculateCardRewardsProgress(
  accounts: BillAccount[],
  expenses: ExpenseItem[],
  targetMonthYear?: string // e.g. "2026-10" or defaults to current month
): CardRewardsProgress[] {
  const currentMonth = targetMonthYear || new Date().toISOString().substring(0, 7);

  // Filter expenses strictly in the active target month
  const monthlyExpenses = (expenses || []).filter((e) => {
    return e.date && e.date.startsWith(currentMonth);
  });

  return accounts
    .filter((a) => a.type === 'credit_card' || a.type === 'ewallet_pay_later')
    .map((acc) => {
      const accExpenses = monthlyExpenses.filter((e) => e.accountId === acc.id);
      const totalMonthlySpend = accExpenses.reduce((sum, e) => sum + e.amount, 0);

      const benefits = getAccountRewards(acc);
      let totalCashback = 0;
      let totalCoins = 0;
      let totalPoints = 0;

      const benefitsProgress = benefits.map((b) => {
        // Filter expenses that qualify for this specific benefit condition
        const qualifyingExpenses = accExpenses.filter((e) => {
          // Day check
          if (b.dayCondition === 'weekends' && !isDateWeekend(e.date)) return false;
          if (b.dayCondition === 'weekdays' && isDateWeekend(e.date)) return false;

          // Category check
          if (!matchesCategoryCondition(e.category, b.categoryCondition)) return false;

          return true;
        });

        const qualifyingSpend = qualifyingExpenses.reduce((sum, e) => sum + e.amount, 0);

        let calculatedEarned = 0;
        if (b.type === 'cashback') {
          calculatedEarned = qualifyingSpend * ((b.ratePercent || 1) / 100);
        } else if (b.type === 'coins') {
          calculatedEarned = qualifyingSpend * (b.coinsPerUnit || 10);
        } else if (b.type === 'points' || b.type === 'miles') {
          calculatedEarned = qualifyingSpend * (b.pointsMultiplier || 1);
        }

        const earnedValue = Math.min(b.monthlyCap, Math.round(calculatedEarned * 100) / 100);
        const remainingCap = Math.max(0, Math.round((b.monthlyCap - earnedValue) * 100) / 100);
        const percentToCap = Math.min(100, Math.round((earnedValue / b.monthlyCap) * 100));
        const isCapped = earnedValue >= b.monthlyCap;

        // Spend required to hit remaining cap
        let remainingSpendToHitCap = 0;
        if (!isCapped) {
          if (b.type === 'cashback') {
            remainingSpendToHitCap = Math.round((remainingCap / ((b.ratePercent || 1) / 100)) * 100) / 100;
          } else if (b.type === 'coins') {
            remainingSpendToHitCap = Math.round((remainingCap / (b.coinsPerUnit || 10)) * 100) / 100;
          } else {
            remainingSpendToHitCap = Math.round((remainingCap / (b.pointsMultiplier || 1)) * 100) / 100;
          }
        }

        if (b.type === 'cashback') totalCashback += earnedValue;
        if (b.type === 'coins') totalCoins += earnedValue;
        if (b.type === 'points' || b.type === 'miles') totalPoints += earnedValue;

        return {
          benefit: b,
          qualifyingSpend,
          earnedValue,
          remainingCap,
          percentToCap,
          isCapped,
          remainingSpendToHitCap,
        };
      });

      const monetaryCashback = totalCashback;
      const monetaryCoins = convertRewardToMonetaryValue('coins', totalCoins);
      const monetaryPoints = convertRewardToMonetaryValue('points', totalPoints);
      const estimatedTotalMonetaryValue = Math.round((monetaryCashback + monetaryCoins + monetaryPoints) * 100) / 100;

      return {
        accountId: acc.id,
        accountName: acc.name,
        accountType: acc.type,
        color: acc.color,
        totalMonthlySpend,
        benefitsProgress,
        totalCashbackEarned: totalCashback,
        totalCoinsEarned: totalCoins,
        totalPointsEarned: totalPoints,
        estimatedTotalMonetaryValue,
      };
    });
}

/**
 * Intelligent Card Recommendation Engine
 * Evaluates all cards for an upcoming transaction:
 * - Calculates projected cashback / coins / points
 * - Differentiates weekends vs weekdays (e.g. AMEX 5% weekend cashback)
 * - Identifies if a card is already capped (penalizes diminishing returns)
 * - Encourages balancing spend across cards to harvest multiple monthly perks
 */
export function recommendBestCardForPurchase(params: {
  amount: number;
  date: string;
  category: string;
  accounts: BillAccount[];
  expenses: ExpenseItem[];
}): CardRecommendation[] {
  const { amount, date, category, accounts, expenses } = params;
  if (!amount || amount <= 0) return [];

  const isWeekend = isDateWeekend(date);
  const currentMonth = date ? date.substring(0, 7) : new Date().toISOString().substring(0, 7);
  const monthlyProgress = calculateCardRewardsProgress(accounts, expenses, currentMonth);

  const eligibleAccounts = accounts.filter((a) => a.type === 'credit_card' || a.type === 'ewallet_pay_later');

  const recommendations: CardRecommendation[] = eligibleAccounts.map((acc) => {
    const progress = monthlyProgress.find((p) => p.accountId === acc.id);
    const benefits = getAccountRewards(acc);

    let bestScore = 0;
    let primaryBenefitType: BenefitType = 'cashback';
    let projectedEarnedDesc = 'No direct bonus';
    let projectedMonetaryVal = 0;
    let reason = 'Standard transaction';
    let isCappedWarning = false;
    let balancingAdvice: string | undefined = undefined;

    for (const b of benefits) {
      const bProgress = progress?.benefitsProgress.find((bp) => bp.benefit.id === b.id);
      const isAlreadyCapped = bProgress ? bProgress.isCapped : false;
      const remainingCap = bProgress ? bProgress.remainingCap : b.monthlyCap;

      // Check day matching
      const dayMatches =
        b.dayCondition === 'any' ||
        (b.dayCondition === 'weekends' && isWeekend) ||
        (b.dayCondition === 'weekdays' && !isWeekend);

      // Check category matching
      const catMatches = matchesCategoryCondition(category, b.categoryCondition);

      if (dayMatches && catMatches) {
        if (isAlreadyCapped) {
          // Diminishing return! Card has maxed out its bonus
          isCappedWarning = true;
          balancingAdvice = `${b.name} monthly cap (${b.monthlyCap} ${b.type === 'coins' ? 'coins' : b.type === 'cashback' ? 'cashback' : 'pts'}) is 100% reached! Divert to another card to balance rewards.`;
        } else {
          let potentialEarned = 0;
          if (b.type === 'cashback') {
            potentialEarned = amount * ((b.ratePercent || 1) / 100);
            const actualEarned = Math.min(potentialEarned, remainingCap);
            const monetaryVal = actualEarned;

            if (monetaryVal > projectedMonetaryVal) {
              projectedMonetaryVal = monetaryVal;
              primaryBenefitType = 'cashback';
              projectedEarnedDesc = `+RM${actualEarned.toFixed(2)} Cashback (${b.ratePercent}% rate)`;
              reason = isWeekend && b.dayCondition === 'weekends'
                ? `🔥 Weekend Perk: 5% Cashback on Saturday & Sunday (RM${remainingCap.toFixed(2)} cap left)`
                : `Earns ${b.ratePercent}% cashback towards monthly RM${b.monthlyCap} cap`;
              bestScore = monetaryVal * 100 + (acc.gracePeriodDays * 0.5); // Favor highest monetary yield + grace period
            }
          } else if (b.type === 'coins') {
            potentialEarned = amount * (b.coinsPerUnit || 10);
            const actualCoins = Math.min(potentialEarned, remainingCap);
            const monetaryVal = convertRewardToMonetaryValue('coins', actualCoins);

            if (monetaryVal > projectedMonetaryVal) {
              projectedMonetaryVal = monetaryVal;
              primaryBenefitType = 'coins';
              projectedEarnedDesc = `+${Math.round(actualCoins).toLocaleString()} Shopee Coins`;
              reason = `Shopee Perk: Earns ${b.coinsPerUnit || 10} coins per RM1 (~RM${monetaryVal.toFixed(2)} value)`;
              bestScore = monetaryVal * 100 + (acc.gracePeriodDays * 0.5);
            }
          } else if (b.type === 'points' || b.type === 'miles') {
            potentialEarned = amount * (b.pointsMultiplier || 1);
            const actualPoints = Math.min(potentialEarned, remainingCap);
            const monetaryVal = convertRewardToMonetaryValue('points', actualPoints);

            if (monetaryVal > projectedMonetaryVal) {
              projectedMonetaryVal = monetaryVal;
              primaryBenefitType = 'points';
              projectedEarnedDesc = `+${Math.round(actualPoints).toLocaleString()} Points (${b.pointsMultiplier}x)`;
              reason = `Category Multiplier: ${b.pointsMultiplier}x points on ${category}`;
              bestScore = monetaryVal * 100 + (acc.gracePeriodDays * 0.5);
            }
          }
        }
      }
    }

    // If no specific bonus matched, assign base score from grace period days
    if (bestScore === 0) {
      bestScore = acc.gracePeriodDays * 0.2;
      projectedEarnedDesc = 'Standard float';
      reason = `${acc.gracePeriodDays}-day interest-free grace window`;
    }

    // Penalize score if capped
    if (isCappedWarning) {
      bestScore = Math.max(0.1, bestScore * 0.2);
    }

    return {
      accountId: acc.id,
      accountName: acc.name,
      accountType: acc.type,
      score: Math.round(bestScore * 10) / 10,
      benefitType: primaryBenefitType,
      projectedEarnedDescription: projectedEarnedDesc,
      projectedMonetaryValue: Math.round(projectedMonetaryVal * 100) / 100,
      reason,
      isCappedWarning,
      balancingAdvice,
      gracePeriodDays: acc.gracePeriodDays,
    };
  });

  return recommendations.sort((a, b) => b.score - a.score);
}

/**
 * Generates an actionable monthly balancing strategy to optimize combined cashback, coins, and points
 */
export function generateRewardsBalancingStrategy(
  accounts: BillAccount[],
  expenses: ExpenseItem[]
): {
  summary: string;
  totalMonthlyCashback: number;
  totalMonthlyCoins: number;
  totalMonthlyPoints: number;
  totalMonetaryValue: number;
  unclaimedPotentialValue: number;
  actions: Array<{
    title: string;
    detail: string;
    cardName: string;
    type: 'priority' | 'warning' | 'tip';
    urgency: 'high' | 'medium' | 'low';
  }>;
} {
  const currentMonth = new Date().toISOString().substring(0, 7);
  const progressList = calculateCardRewardsProgress(accounts, expenses, currentMonth);

  let totalMonthlyCashback = 0;
  let totalMonthlyCoins = 0;
  let totalMonthlyPoints = 0;
  let totalMonetaryValue = 0;
  let unclaimedPotentialValue = 0;

  const actions: Array<{
    title: string;
    detail: string;
    cardName: string;
    type: 'priority' | 'warning' | 'tip';
    urgency: 'high' | 'medium' | 'low';
  }> = [];

  for (const prog of progressList) {
    totalMonthlyCashback += prog.totalCashbackEarned;
    totalMonthlyCoins += prog.totalCoinsEarned;
    totalMonthlyPoints += prog.totalPointsEarned;
    totalMonetaryValue += prog.estimatedTotalMonetaryValue;

    for (const bp of prog.benefitsProgress) {
      const { benefit, remainingCap, percentToCap, isCapped, remainingSpendToHitCap } = bp;

      if (isCapped) {
        actions.push({
          title: `${prog.accountName} ${benefit.name} is Maxed Out`,
          detail: `You have harvested the full cap of ${benefit.monthlyCap} ${benefit.type === 'coins' ? 'coins' : benefit.type === 'cashback' ? 'RM' : 'points'} for this month. Shift remaining ${benefit.categoryCondition === 'all' ? 'purchases' : benefit.categoryCondition} to another card to avoid 0% return!`,
          cardName: prog.accountName,
          type: 'warning',
          urgency: 'high',
        });
      } else if (percentToCap >= 50 && remainingCap > 0) {
        const potentialVal = convertRewardToMonetaryValue(benefit.type, remainingCap);
        unclaimedPotentialValue += potentialVal;
        actions.push({
          title: `Harvest Remaining ${benefit.name}`,
          detail: `You are at ${percentToCap}% of your monthly quota (${bp.earnedValue}/${benefit.monthlyCap}). Spend ~RM${remainingSpendToHitCap.toFixed(0)} more ${benefit.dayCondition === 'weekends' ? 'on weekends' : ''} to unlock your final RM${potentialVal.toFixed(2)} in rewards before month-end!`,
          cardName: prog.accountName,
          type: 'priority',
          urgency: 'high',
        });
      } else if (remainingCap > 0) {
        const potentialVal = convertRewardToMonetaryValue(benefit.type, remainingCap);
        unclaimedPotentialValue += potentialVal;
        actions.push({
          title: `Active Quota: ${benefit.name}`,
          detail: `Eligible for up to ${benefit.monthlyCap} ${benefit.type === 'coins' ? 'coins' : 'RM'} monthly. Route ${benefit.dayCondition === 'weekends' ? 'Saturday/Sunday spending' : benefit.categoryCondition + ' orders'} here to build towards the cap.`,
          cardName: prog.accountName,
          type: 'tip',
          urgency: 'medium',
        });
      }
    }
  }

  const summary = `BillFlow analyzed your card benefits: you have earned ~RM${totalMonetaryValue.toFixed(2)} in combined rewards this month, with ~RM${unclaimedPotentialValue.toFixed(2)} in remaining monthly caps to harvest.`;

  return {
    summary,
    totalMonthlyCashback,
    totalMonthlyCoins,
    totalMonthlyPoints,
    totalMonetaryValue: Math.round(totalMonetaryValue * 100) / 100,
    unclaimedPotentialValue: Math.round(unclaimedPotentialValue * 100) / 100,
    actions,
  };
}
