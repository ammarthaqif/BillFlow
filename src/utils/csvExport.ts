import { ExpenseItem, BillAccount } from '../types';

/**
 * Escapes a single CSV value according to RFC 4180.
 * If the value contains commas, quotes, or newlines, wraps it in quotes and escapes inner quotes.
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface CSVExportOptions {
  statusFilter?: 'all' | 'settled' | 'unsettled';
  categoryFilter?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Generates an RFC 4180 compliant CSV string from an array of ExpenseItem records.
 */
export function generateTransactionsCSV(
  expenses: ExpenseItem[],
  currencyCode: string = 'MYR',
  accounts: BillAccount[] = [],
  options?: CSVExportOptions
): string {
  let filtered = [...expenses];

  if (options?.statusFilter && options.statusFilter !== 'all') {
    filtered = filtered.filter((e) => e.status === options.statusFilter);
  }
  if (options?.categoryFilter && options.categoryFilter !== 'all') {
    filtered = filtered.filter((e) => e.category === options.categoryFilter);
  }
  if (options?.startDate) {
    filtered = filtered.filter((e) => e.date >= options.startDate!);
  }
  if (options?.endDate) {
    filtered = filtered.filter((e) => e.date <= options.endDate!);
  }

  // Sort descending by date
  filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Account lookup map for quick type resolution
  const accountMap = new Map<string, BillAccount>();
  accounts.forEach((acc) => accountMap.set(acc.id, acc));

  const headers = [
    'Transaction ID',
    'Date',
    'Description',
    'Category',
    'Amount',
    'Currency',
    'Account Name',
    'Account Type',
    'Settlement Status',
    'Settled Date',
    'Settlement Method',
    'Settlement Reference',
    'Settled From Account',
    'Interest Avoided Estimate',
    'Is Recurring',
    'Tags',
    'Owner Name',
    'Owner Role',
    'Household Name',
    'Notes'
  ];

  const rows: string[] = [headers.map(escapeCSVValue).join(',')];

  for (const exp of filtered) {
    const acc = accountMap.get(exp.accountId);
    const accName = exp.accountName || acc?.name || 'Unassigned Account';
    const accType = exp.accountType || acc?.type || 'credit_card';

    const row = [
      exp.id,
      exp.date,
      exp.title,
      exp.category,
      Number(exp.amount || 0).toFixed(2),
      currencyCode,
      accName,
      accType,
      exp.status,
      exp.settledAt || '',
      exp.settlementMethod || '',
      exp.settlementReference || '',
      exp.settledFromAccountId || '',
      exp.interestAvoidedEstimate ? Number(exp.interestAvoidedEstimate).toFixed(2) : '0.00',
      exp.isRecurring ? 'Yes' : 'No',
      (exp.tags || []).join('; '),
      exp.ownerName || '',
      exp.ownerRole || '',
      exp.householdName || '',
      exp.notes || ''
    ];

    rows.push(row.map(escapeCSVValue).join(','));
  }

  return rows.join('\r\n');
}

/**
 * Downloads the generated CSV file directly in the browser with proper UTF-8 BOM encoding.
 */
export function downloadTransactionsCSV(
  expenses: ExpenseItem[],
  currencyCode: string = 'MYR',
  accounts: BillAccount[] = [],
  userName: string = 'user',
  options?: CSVExportOptions
): { totalExported: number; filename: string } {
  const csvContent = generateTransactionsCSV(expenses, currencyCode, accounts, options);
  
  // Prepend UTF-8 Byte Order Mark (\uFEFF) for seamless Microsoft Excel & Google Sheets compatibility
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const cleanUserName = userName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') || 'billflow';
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `billflow-transactions-${cleanUserName}-${dateStamp}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  // Return count of items exported
  let count = expenses.length;
  if (options?.statusFilter && options.statusFilter !== 'all') {
    count = expenses.filter((e) => e.status === options.statusFilter).length;
  }

  return { totalExported: count, filename };
}

/**
 * Helper to compute high-level statistics for CSV preview
 */
export function computeCSVStats(expenses: ExpenseItem[]) {
  const totalCount = expenses.length;
  const settledCount = expenses.filter((e) => e.status === 'settled').length;
  const unsettledCount = expenses.filter((e) => e.status === 'unsettled').length;
  const totalAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const settledAmount = expenses
    .filter((e) => e.status === 'settled')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const unsettledAmount = expenses
    .filter((e) => e.status === 'unsettled')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const dates = expenses.map((e) => e.date).filter(Boolean).sort();
  const earliestDate = dates[0] || 'N/A';
  const latestDate = dates[dates.length - 1] || 'N/A';

  return {
    totalCount,
    settledCount,
    unsettledCount,
    totalAmount,
    settledAmount,
    unsettledAmount,
    earliestDate,
    latestDate,
  };
}
