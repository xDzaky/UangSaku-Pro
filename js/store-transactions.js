import { runOnStore } from './idb.js';

const STORE = 'transactions';

const withDefaults = data => ({
  type: 'expense',
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  category: 'Lainnya',
  note: '',
  createdAt: new Date().toISOString(),
  ...data
});

export async function addTransaction(payload) {
  const data = withDefaults(payload);
  const id = await runOnStore(STORE, 'readwrite', store => store.add(data));
  return { ...data, id };
}

export async function updateTransaction(id, changes) {
  const existing = await getTransaction(id);
  if (!existing) throw new Error('Transaksi tidak ditemukan');
  const updated = { ...existing, ...changes };
  await runOnStore(STORE, 'readwrite', store => store.put(updated));
  return updated;
}

export function deleteTransaction(id) {
  return runOnStore(STORE, 'readwrite', store => store.delete(Number(id)));
}

export function getTransaction(id) {
  return runOnStore(STORE, 'readonly', store => store.get(Number(id)));
}

export async function listTransactions(filters = {}) {
  const items = await runOnStore(STORE, 'readonly', store => store.getAll());
  const { startDate, endDate, category, query } = filters;
  return items
    .filter(item => {
      let ok = true;
      if (startDate) ok = ok && item.date >= startDate;
      if (endDate) ok = ok && item.date <= endDate;
      if (category && category !== 'all') ok = ok && item.category === category;
      if (query) ok = ok && (item.note || '').toLowerCase().includes(query.toLowerCase());
      return ok;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

export async function summarizeTransactions({ currencyFormatter }) {
  const items = await listTransactions();
  const income = items.filter(i => i.type === 'income').reduce((sum, i) => sum + Number(i.amount), 0);
  const expense = items.filter(i => i.type === 'expense').reduce((sum, i) => sum + Number(i.amount), 0);
  const balance = income - expense;

  const categories = items
    .filter(i => i.type === 'expense')
    .reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + Number(item.amount);
      return acc;
    }, {});

  const today = new Date();
  const month = today.toISOString().slice(0, 7);
  const monthly = items.filter(i => i.date.startsWith(month));

  return {
    balance,
    income,
    expense,
    categories,
    monthly
  };
}

export async function computeDailyCashflow(days = 7) {
  const items = await listTransactions();
  const now = new Date();
  const map = new Map();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    map.set(key, 0);
  }
  items.forEach(item => {
    if (map.has(item.date)) {
      const delta = item.type === 'income' ? Number(item.amount) : -Number(item.amount);
      map.set(item.date, map.get(item.date) + delta);
    }
  });
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
}

export async function computeMonthlyComparison(months = 4) {
  const items = await listTransactions();
  const map = new Map();
  const now = new Date();
  for (let i = months - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = date.toISOString().slice(0, 7);
    map.set(key, { income: 0, expense: 0 });
  }
  items.forEach(item => {
    const key = item.date.slice(0, 7);
    if (map.has(key)) {
      const bucket = map.get(key);
      bucket[item.type] += Number(item.amount);
    }
  });
  return Array.from(map.entries()).map(([label, data]) => ({ label, ...data }));
}

export async function getCategoryTotalsCurrentMonth() {
  const month = new Date().toISOString().slice(0, 7);
  const transactions = await listTransactions();
  return transactions
    .filter(item => item.type === 'expense' && item.date.startsWith(month))
    .reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + Number(item.amount);
      return acc;
    }, {});
}

export async function clearTransactions() {
  return runOnStore(STORE, 'readwrite', store => store.clear());
}
