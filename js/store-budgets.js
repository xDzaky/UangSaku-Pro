import { runOnStore } from './idb.js';

const STORE = 'budgets';

export async function saveGlobalLimit(amount) {
  await runOnStore(STORE, 'readwrite', store => store.put({ id: 'global', amount: Number(amount) }));
  return amount;
}

export async function saveCategoryLimit(category, amount) {
  if (!category) return;
  await runOnStore(STORE, 'readwrite', store => store.put({ id: `cat:${category}`, amount: Number(amount), category }));
  return amount;
}

export async function removeCategoryLimit(category) {
  return runOnStore(STORE, 'readwrite', store => store.delete(`cat:${category}`));
}

export async function getBudgets() {
  const entries = await runOnStore(STORE, 'readonly', store => store.getAll());
  const result = { global: 0, categories: {} };
  entries.forEach(entry => {
    if (entry.id === 'global') {
      result.global = Number(entry.amount) || 0;
    } else if (entry.id?.startsWith('cat:')) {
      result.categories[entry.category] = Number(entry.amount) || 0;
    }
  });
  return result;
}

export function clearBudgets() {
  return runOnStore(STORE, 'readwrite', store => store.clear());
}

export function buildBudgetAlerts({ transactions = [], budgets }) {
  const month = new Date().toISOString().slice(0, 7);
  const expenses = transactions.filter(t => t.type === 'expense' && t.date.startsWith(month));
  const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

  const alerts = [];
  if (budgets.global) {
    const ratio = totalExpense / budgets.global;
    alerts.push({
      label: 'Limit global',
      limit: budgets.global,
      used: totalExpense,
      level: ratio >= 1 ? 'danger' : ratio >= 0.75 ? 'warn' : 'safe'
    });
  }

  Object.entries(budgets.categories).forEach(([category, limit]) => {
    const used = expenses.filter(item => item.category === category).reduce((sum, item) => sum + Number(item.amount), 0);
    const ratio = limit ? used / limit : 0;
    alerts.push({
      label: category,
      limit,
      used,
      level: ratio >= 1 ? 'danger' : ratio >= 0.85 ? 'warn' : 'safe'
    });
  });

  return alerts;
}
