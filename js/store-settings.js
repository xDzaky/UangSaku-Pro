import { runOnStore } from './idb.js';
import { DEFAULT_CURRENCY } from './constants.js';

const STORE = 'settings';

const defaults = {
  theme: 'auto',
  currency: DEFAULT_CURRENCY,
  dyslexia: false,
  reduceMotion: false
};

export async function setSetting(key, value) {
  await runOnStore(STORE, 'readwrite', store => store.put({ key, value }));
  return value;
}

export async function getSetting(key) {
  const setting = await runOnStore(STORE, 'readonly', store => store.get(key));
  return setting?.value ?? defaults[key];
}

export async function getAllSettings() {
  const rows = await runOnStore(STORE, 'readonly', store => store.getAll());
  return rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), { ...defaults });
}

export function clearSettings() {
  return runOnStore(STORE, 'readwrite', store => store.clear());
}
