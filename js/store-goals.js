import { runOnStore } from './idb.js';

const STORE = 'goals';

const withDefaults = data => ({
  name: 'Target baru',
  amount: 0,
  saved: 0,
  deadline: new Date().toISOString().slice(0, 10),
  createdAt: new Date().toISOString(),
  ...data
});

export async function addGoal(payload) {
  const data = withDefaults(payload);
  const id = await runOnStore(STORE, 'readwrite', store => store.add(data));
  return { ...data, id };
}

export async function updateGoal(id, changes) {
  const existing = await getGoal(id);
  if (!existing) throw new Error('Goal tidak ditemukan');
  const data = { ...existing, ...changes };
  await runOnStore(STORE, 'readwrite', store => store.put(data));
  return data;
}

export function deleteGoal(id) {
  return runOnStore(STORE, 'readwrite', store => store.delete(Number(id)));
}

export function getGoal(id) {
  return runOnStore(STORE, 'readonly', store => store.get(Number(id)));
}

export async function listGoals() {
  const goals = await runOnStore(STORE, 'readonly', store => store.getAll());
  return goals.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
}

export function clearGoals() {
  return runOnStore(STORE, 'readwrite', store => store.clear());
}

export function buildGoalMeta(goal) {
  const progress = goal.amount ? Math.min(100, Math.round((Number(goal.saved) / Number(goal.amount)) * 100)) : 0;
  const remaining = Math.max(0, Number(goal.amount) - Number(goal.saved));
  const daysLeft = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
  const dailySuggestion = daysLeft > 0 ? Math.ceil(remaining / daysLeft) : remaining;
  return { progress, remaining, daysLeft, dailySuggestion };
}
