import { listTransactions, addTransaction, clearTransactions } from './store-transactions.js';
import { getBudgets, saveGlobalLimit, saveCategoryLimit, clearBudgets } from './store-budgets.js';
import { listGoals, addGoal, clearGoals } from './store-goals.js';
import { getAllSettings, setSetting, clearSettings } from './store-settings.js';

export async function exportData() {
  const [transactions, budgets, goals, settings] = await Promise.all([
    listTransactions(),
    getBudgets(),
    listGoals(),
    getAllSettings()
  ]);
  return { exportedAt: new Date().toISOString(), transactions, budgets, goals, settings };
}

export async function importData(data) {
  if (!data || typeof data !== 'object') throw new Error('Format data tidak valid');
  await Promise.all([clearTransactions(), clearBudgets(), clearGoals(), clearSettings()]);

  for (const item of data.transactions || []) {
    const { id, ...rest } = item;
    await addTransaction(rest);
  }

  if (data.budgets?.global) {
    await saveGlobalLimit(data.budgets.global);
  }
  if (data.budgets?.categories) {
    for (const [category, amount] of Object.entries(data.budgets.categories)) {
      await saveCategoryLimit(category, amount);
    }
  }

  for (const goal of data.goals || []) {
    const { id, ...rest } = goal;
    await addGoal(rest);
  }

  if (data.settings) {
    for (const [key, value] of Object.entries(data.settings)) {
      await setSetting(key, value);
    }
  }
}

export async function resetAllData() {
  await Promise.all([clearTransactions(), clearBudgets(), clearGoals(), clearSettings()]);
}
