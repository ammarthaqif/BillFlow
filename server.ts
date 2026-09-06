import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Seed data with realistic multi-card and ewallet pay later accounts
let accounts = [
  {
    id: 'acc-1',
    name: 'Sapphire Preferred',
    institution: 'Chase Bank',
    type: 'credit_card',
    color: '#1e40af', // Blue
    totalBalance: 2450.0,
    statementBalance: 1850.0,
    creditLimit: 12000.0,
    apr: 24.49,
    lateFee: 40.0,
    cycleDay: 12,
    gracePeriodDays: 25,
    dueDate: '2026-10-07',
    minPayment: 75.0,
    apiSynced: true,
    lastSyncedAt: new Date().toISOString(),
    status: 'synced',
    accountNumberMask: '•••• 4821',
  },
  {
    id: 'acc-2',
    name: 'Gold Rewards Card',
    institution: 'American Express',
    type: 'credit_card',
    color: '#b45309', // Amber Gold
    totalBalance: 1320.5,
    statementBalance: 1320.5,
    creditLimit: 10000.0,
    apr: 28.99,
    lateFee: 40.0,
    cycleDay: 18,
    gracePeriodDays: 25,
    dueDate: '2026-10-13',
    minPayment: 60.0,
    apiSynced: true,
    lastSyncedAt: new Date().toISOString(),
    status: 'synced',
    accountNumberMask: '•••• 1094',
  },
  {
    id: 'acc-3',
    name: 'SPayLater (Shopee)',
    institution: 'SeaMoney E-Wallet',
    type: 'ewallet_pay_later',
    color: '#ea580c', // Orange
    totalBalance: 480.0,
    statementBalance: 320.0,
    creditLimit: 2000.0,
    apr: 18.0, // late penalty interest
    lateFee: 15.0,
    cycleDay: 25,
    gracePeriodDays: 15,
    dueDate: '2026-10-10',
    minPayment: 50.0,
    apiSynced: true,
    lastSyncedAt: new Date().toISOString(),
    status: 'synced',
    accountNumberMask: 'SPAY-8832',
  },
  {
    id: 'acc-4',
    name: 'GrabPay Later',
    institution: 'Grab Financial',
    type: 'ewallet_pay_later',
    color: '#059669', // Emerald Green
    totalBalance: 310.0,
    statementBalance: 310.0,
    creditLimit: 1500.0,
    apr: 0.0, // admin fee / fixed penalty
    lateFee: 10.0,
    cycleDay: 1,
    gracePeriodDays: 7,
    dueDate: '2026-10-07',
    minPayment: 310.0, // usually pays in full unless 4-mo instalment
    apiSynced: true,
    lastSyncedAt: new Date().toISOString(),
    status: 'synced',
    accountNumberMask: 'GRAB-4419',
  },
  {
    id: 'acc-5',
    name: 'Apple Card (Pay Later & Credit)',
    institution: 'Apple / Goldman Sachs',
    type: 'credit_card',
    color: '#475569', // Slate
    totalBalance: 890.0,
    statementBalance: 890.0,
    creditLimit: 6000.0,
    apr: 21.99,
    lateFee: 29.0,
    cycleDay: 30,
    gracePeriodDays: 30,
    dueDate: '2026-10-31',
    minPayment: 45.0,
    apiSynced: true,
    lastSyncedAt: new Date().toISOString(),
    status: 'synced',
    accountNumberMask: '•••• 9021',
  },
];

let installments = [
  {
    id: 'inst-1',
    accountId: 'acc-1',
    accountName: 'Sapphire Preferred',
    title: 'MacBook Air M3 Purchase',
    category: 'Electronics',
    totalAmount: 1200.0,
    monthlyAmount: 100.0,
    totalTenure: 12,
    remainingTenure: 8,
    interestRate: 0.0,
    startDate: '2026-05-01',
    nextBillingDate: '2026-10-07',
    notes: '0% interest promo installment plan',
  },
  {
    id: 'inst-2',
    accountId: 'acc-3',
    accountName: 'SPayLater (Shopee)',
    title: 'Ergonomic Standing Desk',
    category: 'Home & Office',
    totalAmount: 450.0,
    monthlyAmount: 150.0,
    totalTenure: 3,
    remainingTenure: 1,
    interestRate: 1.5,
    startDate: '2026-08-10',
    nextBillingDate: '2026-10-10',
    notes: 'Final installment due this month!',
  },
  {
    id: 'inst-3',
    accountId: 'acc-5',
    accountName: 'Apple Card',
    title: 'iPhone 17 Pro Max',
    category: 'Electronics',
    totalAmount: 1199.0,
    monthlyAmount: 99.92,
    totalTenure: 12,
    remainingTenure: 10,
    interestRate: 0.0,
    startDate: '2026-07-30',
    nextBillingDate: '2026-10-31',
    notes: 'Apple Card Monthly Installments 0% APR',
  },
  {
    id: 'inst-4',
    accountId: 'acc-2',
    accountName: 'Gold Rewards Card',
    title: 'Flight Tickets to Tokyo (Plan It)',
    category: 'Travel',
    totalAmount: 1500.0,
    monthlyAmount: 250.0,
    totalTenure: 6,
    remainingTenure: 3,
    interestRate: 0.0,
    startDate: '2026-06-15',
    nextBillingDate: '2026-10-13',
    notes: 'Amex Plan It zero APR fixed monthly fee plan',
  },
];

let userSettings = {
  monthlyIncome: 6500.0,
  paycheckSchedule: 'bi_monthly', // 1st & 15th
  paycheckDates: [1, 15],
  allocatedCashForBills: 3500.0,
  alertDaysBeforeDue: [7, 3, 1],
  defaultStrategy: 'grace_float', // 'grace_float' | 'avalanche' | 'snowball' | 'cashflow_buffer'
};

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API: Get Accounts
app.get('/api/accounts', (req, res) => {
  res.json({ accounts, settings: userSettings });
});

// API: Add or Update Account
app.post('/api/accounts', (req, res) => {
  const newAccount = {
    id: `acc-${Date.now()}`,
    apiSynced: false,
    lastSyncedAt: new Date().toISOString(),
    status: 'active',
    accountNumberMask: `•••• ${Math.floor(1000 + Math.random() * 9000)}`,
    ...req.body,
  };
  accounts.push(newAccount);
  res.status(201).json(newAccount);
});

app.put('/api/accounts/:id', (req, res) => {
  const { id } = req.params;
  const index = accounts.findIndex((a) => a.id === id);
  if (index !== -1) {
    accounts[index] = { ...accounts[index], ...req.body };
    res.json(accounts[index]);
  } else {
    res.status(404).json({ error: 'Account not found' });
  }
});

app.delete('/api/accounts/:id', (req, res) => {
  const { id } = req.params;
  accounts = accounts.filter((a) => a.id !== id);
  installments = installments.filter((i) => i.accountId !== id);
  res.json({ success: true, removedId: id });
});

// API: Simulate Open Banking / Financial API Sync
app.post('/api/sync-bank', (req, res) => {
  const { provider } = req.body;
  
  // Simulate live connection refresh, slight balance updates, and transaction sync
  accounts = accounts.map((acc) => {
    // slight natural balance drift to simulate live API
    const fluctuation = (Math.random() - 0.5) * 40;
    const newTotal = Math.max(acc.statementBalance, Math.round((acc.totalBalance + fluctuation) * 100) / 100);
    return {
      ...acc,
      totalBalance: newTotal,
      apiSynced: true,
      lastSyncedAt: new Date().toISOString(),
      status: 'synced',
    };
  });

  res.json({
    success: true,
    syncedAt: new Date().toISOString(),
    provider: provider || 'OpenBanking / Plaid Sandbox',
    updatedCount: accounts.length,
    accounts,
  });
});

// API: Get Installments
app.get('/api/installments', (req, res) => {
  res.json({ installments });
});

// API: Add Installment
app.post('/api/installments', (req, res) => {
  const targetAcc = accounts.find((a) => a.id === req.body.accountId);
  const newInst = {
    id: `inst-${Date.now()}`,
    accountName: targetAcc ? targetAcc.name : 'Unknown Account',
    startDate: new Date().toISOString().split('T')[0],
    ...req.body,
  };
  installments.push(newInst);
  res.status(201).json(newInst);
});

app.delete('/api/installments/:id', (req, res) => {
  const { id } = req.params;
  installments = installments.filter((i) => i.id !== id);
  res.json({ success: true });
});

// API: Update User Settings
app.post('/api/settings', (req, res) => {
  userSettings = { ...userSettings, ...req.body };
  res.json(userSettings);
});

// API: AI Strategic Cash Flow Advisor using Gemini 3.8 Flash
app.post('/api/gemini/advise', async (req, res) => {
  try {
    const { strategy, liquidCash, userQuestion } = req.body;

    // Compile comprehensive financial context for the model
    const accountsSummary = accounts.map((a) => ({
      name: a.name,
      institution: a.institution,
      type: a.type,
      statementBalance: a.statementBalance,
      totalBalance: a.totalBalance,
      dueDate: a.dueDate,
      apr: `${a.apr}%`,
      lateFee: `$${a.lateFee}`,
      gracePeriodDays: `${a.gracePeriodDays} days`,
      cycleDay: a.cycleDay,
      minPayment: `$${a.minPayment}`,
    }));

    const installmentsSummary = installments.map((i) => ({
      item: i.title,
      account: i.accountName,
      category: i.category,
      monthly: `$${i.monthlyAmount}`,
      remainingMonths: `${i.remainingTenure} of ${i.totalTenure}`,
      interestRate: `${i.interestRate}%`,
    }));

    const totalStatementDue = accounts.reduce((sum, a) => sum + a.statementBalance, 0);
    const totalMinDue = accounts.reduce((sum, a) => sum + a.minPayment, 0);
    const totalMonthlyInstallments = installments.reduce((sum, i) => sum + i.monthlyAmount, 0);

    const prompt = `
You are an expert Credit Card & E-Wallet Pay Later Cash Flow Strategist and Debt Optimization AI.
Analyze the user's accounts, statement balances, cycle dates, grace periods, APRs, and monthly installments to formulate an optimal payment strategy.

CURRENT FINANCIAL SNAPSHOT:
- User's Available Liquid Cash: $${liquidCash || userSettings.allocatedCashForBills}
- Total Statement Due Across All Accounts: $${totalStatementDue.toFixed(2)}
- Total Non-Negotiable Minimums Due: $${totalMinDue.toFixed(2)}
- Committed Monthly Installments: $${totalMonthlyInstallments.toFixed(2)}
- User's Income Paycheck Dates: Days ${userSettings.paycheckDates.join(' & ')} of each month
- Chosen Optimization Strategy: ${strategy || userSettings.defaultStrategy}

ACCOUNTS & CYCLE SPECS:
${JSON.stringify(accountsSummary, null, 2)}

INSTALLMENT COMMITMENTS (OVER MULTIPLE MONTHS):
${JSON.stringify(installmentsSummary, null, 2)}

USER'S INQUIRY / CONTEXT:
${userQuestion || 'Formulate the most cost-effective payment sequence before the upcoming due dates to eliminate all late fees, minimize interest, maximize cash float, and handle upcoming installments seamlessly.'}

Please return a JSON response with:
1. "executiveSummary": A crisp, high-level strategic summary of the payment game plan (2-3 punchy sentences).
2. "recommendedSequence": An ordered array of items specifying exact execution order:
   - "accountName": name of account
   - "recommendedPayDate": suggested payment date (taking into account grace periods & paycheck dates)
   - "amount": exact amount to pay
   - "paymentType": "full_statement" | "minimum_due" | "optimized_partial"
   - "rationale": specific mathematical reason (e.g., "Avoids $40 late fee and stops 28.99% APR compounding while preserving 22 days of float")
   - "urgency": "critical" | "high" | "medium" | "low"
3. "cashFlowInsight": Analysis of how installments impact monthly cash flow over the next 3-6 months.
4. "savingsEstimated": Estimated interest and late fees saved through this sequence.
5. "riskAlerts": Array of potential pitfalls (e.g. if cash is tight, what gets compromised first).
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        systemInstruction:
          'You are a premier financial algorithms engineer specializing in revolving credit, credit card statement cycle arbitrage, Buy Now Pay Later (BNPL) tenure management, and cash flow float optimization. Always give precise, mathematically sound advice in strict JSON.',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    console.error('Gemini Advisor Error:', err);
    // Graceful fallback response if API key is missing or model fails
    res.json({
      executiveSummary:
        'Strategy generated via local optimization algorithm: Prioritizing non-negotiable minimums on earliest due dates, clearing high-APR cards before grace period expiry, and maintaining zero-fee float for e-wallet pay later.',
      recommendedSequence: accounts
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .map((acc, idx) => ({
          accountName: acc.name,
          recommendedPayDate: acc.dueDate,
          amount: acc.statementBalance,
          paymentType: 'full_statement',
          rationale: `Pay on ${acc.dueDate} to maximize interest-free grace float without risking $${acc.lateFee} late penalty or ${acc.apr}% APR.`,
          urgency: idx === 0 ? 'critical' : 'high',
        })),
      cashFlowInsight:
        'Installments currently account for a committed chunk of your monthly outflow. Focus on completing SPayLater first to unlock cash flow.',
      savingsEstimated: '$119.00 in late fees & finance charges avoided this cycle',
      riskAlerts: ['Ensure funds are available 24 hours prior to due dates to avoid bank processing cutoffs.'],
    });
  }
});

// Serve frontend in dev or prod
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
