import { initDashboardUI, initTransactionsUI, initBudgetsUI, initGoalsUI, initReportsUI, initSettingsUI } from './ui.js';
import { getAllSettings, setSetting } from './store-settings.js';
import { applyDyslexiaMode, applyReducedMotion, initKeyboardShortcuts } from './a11y.js';

const CONTROLLERS = {
  dashboard: initDashboardUI,
  transactions: initTransactionsUI,
  budgets: initBudgetsUI,
  goals: initGoalsUI,
  reports: initReportsUI,
  settings: initSettingsUI
};

function highlightNavigation(page) {
  document.querySelectorAll('.nav-list a').forEach(link => {
    const active = link.getAttribute('href').includes(page === 'dashboard' ? 'index' : page);
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
  });
}

function applyThemePreference(theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'auto' && prefersDark);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

async function bootstrap() {
  const body = document.body;
  const page = body.dataset.page || 'dashboard';
  highlightNavigation(page);

  const settings = await getAllSettings();
  applyThemePreference(settings.theme);
  applyDyslexiaMode(settings.dyslexia);
  applyReducedMotion(settings.reduceMotion);

  const handleSettingBroadcast = event => {
    const { key, value } = event.detail || {};
    if (!key) return;
    settings[key] = value;
    if (key === 'theme') applyThemePreference(value);
    if (key === 'dyslexia') applyDyslexiaMode(value);
    if (key === 'reduceMotion') applyReducedMotion(value);
  };
  window.addEventListener('settings:update', handleSettingBroadcast);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/js/sw.js').catch(() => {});
  }

  const controller = CONTROLLERS[page];
  controller?.({ settings, onSettingChange: setSetting });

  initKeyboardShortcuts({
    focusSearch: () => document.querySelector('input[type="search"], input[name="query"]')?.focus(),
    openTransactionModal: () => document.querySelector('[data-action="open-transaction-modal"]')?.click()
  });

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const schemeListener = () => {
    if (settings.theme === 'auto') {
      applyThemePreference('auto');
    }
  };
  if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', schemeListener);
  else if (mediaQuery.addListener) mediaQuery.addListener(schemeListener);
}

document.addEventListener('DOMContentLoaded', bootstrap);
