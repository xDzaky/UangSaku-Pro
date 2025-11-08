import {
  listTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  summarizeTransactions,
  computeDailyCashflow,
  computeMonthlyComparison,
  getCategoryTotalsCurrentMonth
} from './store-transactions.js';
import {
  getBudgets,
  saveGlobalLimit,
  saveCategoryLimit,
  removeCategoryLimit,
  buildBudgetAlerts
} from './store-budgets.js';
import { listGoals, addGoal, updateGoal, deleteGoal, buildGoalMeta } from './store-goals.js';
import { renderDoughnut, renderLine, renderBar } from './charts.js';
import { CATEGORY_OPTIONS } from './constants.js';
import { exportData, importData, resetAllData } from './data-sync.js';
import { escapeHTML } from './sanitize.js';
import { applyDyslexiaMode, applyReducedMotion } from './a11y.js';

const palette = ['#0ea5e9', '#14b8a6', '#f97316', '#f43f5e', '#a855f7', '#facc15', '#22c55e', '#94a3b8'];

const formatCurrency = (value = 0, currency = 'IDR') => {
  try {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  } catch (error) {
    return `Rp${Number(value).toLocaleString('id-ID')}`;
  }
};

const populateCategories = (select, { includeAll = false } = {}) => {
  if (!select) return;
  const options = [includeAll ? '<option value="all">Semua</option>' : ''];
  CATEGORY_OPTIONS.forEach(cat => {
    options.push(`<option value="${cat}">${cat}</option>`);
  });
  select.innerHTML = options.join('');
};

const openDialog = dialog => {
  if (!dialog) return;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
};

const closeDialog = dialog => {
  if (!dialog) return;
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
};

const downloadJSON = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const setStatusText = (selector, text) => {
  const el = document.querySelector(selector);
  if (el) el.textContent = text;
};

const emitSettingChange = (key, value) => {
  window.dispatchEvent(new CustomEvent('settings:update', { detail: { key, value } }));
};

export function initDashboardUI({ settings }) {
  const currency = settings.currency;
  const balanceEl = document.getElementById('balanceValue');
  const incomeEl = document.getElementById('incomeValue');
  const expenseEl = document.getElementById('expenseValue');
  const budgetReminderEl = document.getElementById('budgetReminder');
  const budgetStatusTextEl = document.getElementById('budgetStatusText');
  const goalsList = document.getElementById('dashboardGoals');

  async function renderDashboard() {
    const summary = await summarizeTransactions({});
    const budgets = await getBudgets();
    const monthlyExpense = summary.monthly
      .filter(item => item.type === 'expense')
      .reduce((total, item) => total + Number(item.amount), 0);

    if (balanceEl) balanceEl.textContent = formatCurrency(summary.balance, currency);
    if (incomeEl) incomeEl.textContent = formatCurrency(summary.income, currency);
    if (expenseEl) expenseEl.textContent = formatCurrency(summary.expense, currency);

    if (budgets.global) {
      const remaining = Math.max(0, budgets.global - monthlyExpense);
      if (budgetReminderEl) budgetReminderEl.textContent = formatCurrency(remaining, currency);
      const ratio = monthlyExpense / budgets.global;
      const state = ratio >= 1 ? 'Habis' : ratio >= 0.85 ? 'Mendekati limit' : 'Aman';
      if (budgetStatusTextEl) {
        budgetStatusTextEl.textContent = `${state} • Terpakai ${Math.min(100, Math.round(ratio * 100))}%`;
      }
    } else {
      if (budgetReminderEl) budgetReminderEl.textContent = 'Belum ada limit';
      if (budgetStatusTextEl) budgetStatusTextEl.textContent = 'Atur limit di halaman Anggaran';
    }

    const categoryTotals = await getCategoryTotalsCurrentMonth();
    const labels = Object.keys(categoryTotals);
    if (labels.length) {
      await renderDoughnut(document.getElementById('categoryChart'), {
        labels,
        datasets: [
          {
            label: 'Pengeluaran',
            data: Object.values(categoryTotals),
            backgroundColor: labels.map((_, idx) => palette[idx % palette.length])
          }
        ]
      });
    }

    const daily = await computeDailyCashflow(7);
    if (daily.length) {
      await renderLine(document.getElementById('cashflowChart'), {
        labels: daily.map(item => item.label.slice(5)),
        datasets: [
          {
            label: 'Cashflow',
            data: daily.map(item => item.value),
            borderColor: palette[0],
            backgroundColor: 'rgba(14,165,233,0.3)',
            fill: true
          }
        ]
      });
    }

    const monthly = await computeMonthlyComparison(4);
    if (monthly.length) {
      await renderBar(document.getElementById('monthlyChart'), {
        labels: monthly.map(m => m.label),
        datasets: [
          {
            label: 'Pemasukan',
            backgroundColor: palette[1],
            data: monthly.map(m => m.income)
          },
          {
            label: 'Pengeluaran',
            backgroundColor: palette[3],
            data: monthly.map(m => m.expense)
          }
        ]
      });
    }

    if (goalsList) {
      const goals = await listGoals();
      if (!goals.length) {
        goalsList.innerHTML = '<li class="muted">Belum ada target aktif.</li>';
      } else {
        goalsList.innerHTML = goals.slice(0, 3).map(goal => {
          const meta = buildGoalMeta(goal);
          return `
            <li class="goal-card">
              <div class="goal-head">
                <strong>${escapeHTML(goal.name)}</strong>
                <span>${meta.progress}%</span>
              </div>
              <div class="progress" aria-label="Progress ${meta.progress}%">
                <div class="progress-bar" style="width:${meta.progress}%"></div>
              </div>
              <p class="muted">Butuh ${formatCurrency(meta.remaining, currency)} lagi · ${meta.daysLeft} hari · ${formatCurrency(meta.dailySuggestion, currency)}/hari</p>
            </li>`;
        }).join('');
      }
    }
  }

  renderDashboard();
}

export function initTransactionsUI({ settings }) {
  const currency = settings.currency;
  const filtersForm = document.getElementById('transactionFilters');
  const tableBody = document.getElementById('transactionTable');
  const dialog = document.getElementById('transactionDialog');
  const form = document.getElementById('transactionForm');
  const categoryFilter = document.getElementById('categoryFilter');
  const categoryInput = document.getElementById('categoryInput');
  const openButton = document.querySelector('[data-action="open-transaction-modal"]');

  if (!filtersForm || !tableBody || !dialog || !form) return;

  populateCategories(categoryFilter, { includeAll: true });
  populateCategories(categoryInput);

  const renderTransactions = async () => {
    if (!tableBody) return;
    const formData = new FormData(filtersForm);
    const filters = {
      startDate: formData.get('startDate') || undefined,
      endDate: formData.get('endDate') || undefined,
      category: formData.get('category') || 'all',
      query: formData.get('query')?.trim() || undefined
    };
    const transactions = await listTransactions(filters);
    if (!transactions.length) {
      tableBody.innerHTML = '<tr><td colspan="6" class="muted">Belum ada data.</td></tr>';
      return;
    }
    tableBody.innerHTML = transactions
      .map(item => `
        <tr>
          <td>${escapeHTML(item.date)}</td>
          <td>${escapeHTML(item.category)}</td>
          <td>${escapeHTML(item.note || '-')}</td>
          <td><span class="badge ${item.type}">${item.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</span></td>
          <td>${formatCurrency(item.amount, currency)}</td>
          <td>
            <button class="btn ghost" data-action="edit-transaction" data-id="${item.id}">Edit</button>
            <button class="btn danger" data-action="delete-transaction" data-id="${item.id}">Hapus</button>
          </td>
        </tr>`)
      .join('');
  };

  filtersForm?.addEventListener('submit', event => {
    event.preventDefault();
    renderTransactions();
  });

  filtersForm?.addEventListener('reset', () => setTimeout(renderTransactions, 0));

  document.addEventListener('click', event => {
    if (event.target?.matches('[data-action="close-dialog"]')) {
      closeDialog(event.target.closest('dialog'));
    }
  });

  openButton?.addEventListener('click', () => {
    form.reset();
    dialog.dataset.mode = 'create';
    dialog.dataset.editId = '';
    document.getElementById('transactionDialogTitle').textContent = 'Tambah transaksi';
    openDialog(dialog);
  });

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.amount = Number(data.amount);
    const editId = dialog.dataset.editId;
    if (editId) await updateTransaction(Number(editId), data);
    else await addTransaction(data);
    closeDialog(dialog);
    renderTransactions();
  });

  tableBody?.addEventListener('click', event => {
    const target = event.target;
    if (target.matches('[data-action="delete-transaction"]')) {
      const { id } = target.dataset;
      if (confirm('Hapus transaksi ini?')) {
        deleteTransaction(Number(id)).then(renderTransactions);
      }
    }
    if (target.matches('[data-action="edit-transaction"]')) {
      const { id } = target.dataset;
      listTransactions().then(list => {
        const item = list.find(t => t.id === Number(id));
        if (!item) return;
        Object.entries(item).forEach(([key, value]) => {
          if (form.elements[key]) form.elements[key].value = value;
        });
        dialog.dataset.editId = id;
        dialog.dataset.mode = 'edit';
        document.getElementById('transactionDialogTitle').textContent = 'Edit transaksi';
        openDialog(dialog);
      });
    }
  });

  renderTransactions();
}

export function initBudgetsUI({ settings }) {
  const currency = settings.currency;
  const globalForm = document.getElementById('globalBudgetForm');
  const categoryForm = document.getElementById('categoryBudgetForm');
  const statusEl = document.getElementById('globalBudgetStatus');
  const categoryList = document.getElementById('categoryBudgetList');
  const alertsEl = document.getElementById('budgetAlerts');
  const categorySelect = document.getElementById('budgetCategory');

  if (!globalForm || !categoryForm || !statusEl || !categoryList || !alertsEl) return;

  populateCategories(categorySelect);

  async function renderBudgets() {
    const [budgets, transactions] = await Promise.all([getBudgets(), listTransactions()]);
    if (globalForm?.amount) globalForm.amount.value = budgets.global || '';
    statusEl.textContent = budgets.global ? `Limit global: ${formatCurrency(budgets.global, currency)}` : 'Belum ada limit global';

    categoryList.innerHTML = Object.entries(budgets.categories).length
      ? Object.entries(budgets.categories)
          .map(([category, limit]) => {
            const spent = transactions
              .filter(t => t.type === 'expense' && t.category === category)
              .reduce((sum, item) => sum + Number(item.amount), 0);
            const percent = limit ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
            return `
              <li>
                <div class="row">
                  <strong>${escapeHTML(category)}</strong>
                  <span>${formatCurrency(spent, currency)} / ${formatCurrency(limit, currency)}</span>
                </div>
                <div class="progress" aria-label="${percent}%">
                  <div class="progress-bar" style="width:${percent}%"></div>
                </div>
                <button class="btn ghost" data-action="remove-budget" data-category="${category}">Hapus limit</button>
              </li>`;
          })
          .join('')
      : '<li class="muted">Belum ada limit per kategori.</li>';

    const alerts = buildBudgetAlerts({ transactions, budgets });
    alertsEl.innerHTML = alerts.length
      ? alerts
          .map(alert => `
            <li class="${alert.level}">
              <strong>${escapeHTML(alert.label)}</strong>
              <p class="muted">${formatCurrency(alert.used, currency)} / ${formatCurrency(alert.limit, currency)}</p>
            </li>`)
          .join('')
      : '<li class="muted">Belum ada data yang bisa dianalisis.</li>';
  }

  globalForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const value = Number(new FormData(globalForm).get('amount'));
    await saveGlobalLimit(value);
    renderBudgets();
  });

  categoryForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const formData = new FormData(categoryForm);
    await saveCategoryLimit(formData.get('category'), Number(formData.get('amount')));
    categoryForm.reset();
    renderBudgets();
  });

  categoryList?.addEventListener('click', event => {
    const btn = event.target;
    if (btn.matches('[data-action="remove-budget"]')) {
      removeCategoryLimit(btn.dataset.category).then(renderBudgets);
    }
  });

  renderBudgets();
}

export function initGoalsUI({ settings }) {
  const currency = settings.currency;
  const listEl = document.getElementById('goalsList');
  const dialog = document.getElementById('goalDialog');
  const form = document.getElementById('goalForm');
  const openBtn = document.querySelector('[data-action="open-goal-dialog"]');

  if (!listEl || !dialog || !form) return;

  const renderGoals = async () => {
    const goals = await listGoals();
    if (!goals.length) {
      listEl.innerHTML = '<li class="muted">Belum ada target. Klik tombol + untuk menambah.</li>';
      return;
    }
    listEl.innerHTML = goals
      .map(goal => {
        const meta = buildGoalMeta(goal);
        return `
          <li class="goal-card" data-id="${goal.id}">
            <header class="goal-head">
              <div>
                <strong>${escapeHTML(goal.name)}</strong>
                <p class="muted">Deadline ${escapeHTML(goal.deadline)}</p>
              </div>
              <span>${meta.progress}%</span>
            </header>
            <p>${formatCurrency(goal.saved, currency)} / ${formatCurrency(goal.amount, currency)}</p>
            <div class="progress" aria-label="Progress ${meta.progress}%">
              <div class="progress-bar" style="width:${meta.progress}%"></div>
            </div>
            <p class="muted">Butuh ${formatCurrency(meta.remaining, currency)} lagi • ${meta.daysLeft} hari • ${formatCurrency(meta.dailySuggestion, currency)}/hari</p>
            <div class="goal-actions">
              <button class="btn" data-action="edit-goal" data-id="${goal.id}">Edit</button>
              <button class="btn ghost" data-action="mark-goal" data-id="${goal.id}">Tandai tercapai</button>
              <button class="btn danger" data-action="delete-goal" data-id="${goal.id}">Hapus</button>
            </div>
          </li>`;
      })
      .join('');
  };

  openBtn?.addEventListener('click', () => {
    form.reset();
    dialog.dataset.editId = '';
    document.getElementById('goalDialogTitle').textContent = 'Target baru';
    openDialog(dialog);
  });

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(form).entries());
    formData.amount = Number(formData.amount);
    formData.saved = Number(formData.saved);
    const editId = dialog.dataset.editId;
    if (editId) await updateGoal(Number(editId), formData);
    else await addGoal(formData);
    closeDialog(dialog);
    renderGoals();
  });

  listEl?.addEventListener('click', event => {
    const btn = event.target;
    if (btn.matches('[data-action="delete-goal"]')) {
      if (confirm('Hapus target ini?')) deleteGoal(Number(btn.dataset.id)).then(renderGoals);
    }
    if (btn.matches('[data-action="mark-goal"]')) {
      const id = Number(btn.dataset.id);
      listGoals().then(goals => {
        const goal = goals.find(item => item.id === id);
        if (!goal) return;
        updateGoal(id, { saved: goal.amount }).then(renderGoals);
      });
    }
    if (btn.matches('[data-action="edit-goal"]')) {
      const id = Number(btn.dataset.id);
      listGoals().then(goals => {
        const goal = goals.find(item => item.id === id);
        if (!goal) return;
        Object.entries(goal).forEach(([key, value]) => {
          if (form.elements[key]) form.elements[key].value = value;
        });
        dialog.dataset.editId = id;
        document.getElementById('goalDialogTitle').textContent = 'Edit target';
        openDialog(dialog);
      });
    }
  });

  renderGoals();
}

export function initReportsUI({ settings }) {
  const currency = settings.currency;
  const form = document.getElementById('reportForm');
  const summaryEl = document.getElementById('reportSummary');
  const printBtn = document.querySelector('[data-action="print-report"]');
  const exportBtn = document.querySelector('[data-action="export-report"]');
  let lastReport = null;

  if (!form || !summaryEl) return;

  const setRangeDefaults = value => {
    const startInput = form.start;
    const endInput = form.end;
    const today = new Date();
    if (value === 'weekly') {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      startInput.value = start.toISOString().slice(0, 10);
      endInput.value = today.toISOString().slice(0, 10);
    } else if (value === 'monthly') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      startInput.value = start.toISOString().slice(0, 10);
      endInput.value = end.toISOString().slice(0, 10);
    }
  };

  form?.range?.addEventListener('change', () => setRangeDefaults(form.range.value));
  setRangeDefaults('weekly');

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const formData = new FormData(form);
    const start = formData.get('start');
    const end = formData.get('end');
    if (start > end) {
      summaryEl.innerHTML = '<p class="danger">Rentang tanggal tidak valid.</p>';
      return;
    }
    const transactions = await listTransactions({ startDate: start, endDate: end });
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    const balance = income - expense;
    const categories = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
        return acc;
      }, {});
    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
    lastReport = {
      generatedAt: new Date().toISOString(),
      start,
      end,
      income,
      expense,
      balance,
      topCategory: topCategory ? { category: topCategory[0], amount: topCategory[1] } : null,
      totalTransactions: transactions.length
    };
    summaryEl.innerHTML = `
      <p><strong>Periode:</strong> ${start} s/d ${end}</p>
      <p><strong>Pemasukan:</strong> ${formatCurrency(income, currency)}</p>
      <p><strong>Pengeluaran:</strong> ${formatCurrency(expense, currency)}</p>
      <p><strong>Saldo bersih:</strong> ${formatCurrency(balance, currency)}</p>
      <p><strong>Kategori terbesar:</strong> ${topCategory ? `${escapeHTML(topCategory[0])} (${formatCurrency(topCategory[1], currency)})` : '—'}</p>
      <p><strong>Total transaksi:</strong> ${transactions.length}</p>`;
  });

  printBtn?.addEventListener('click', () => window.print());
  exportBtn?.addEventListener('click', () => {
    if (!lastReport) {
      alert('Buat laporan terlebih dahulu.');
      return;
    }
    downloadJSON(lastReport, 'uangsaku-report.json');
  });
}

export function initSettingsUI({ settings, onSettingChange }) {
  const form = document.getElementById('appearanceForm');
  const exportBtn = document.querySelector('[data-action="export-data"]');
  const importInput = document.getElementById('importInput');
  const resetBtn = document.querySelector('[data-action="reset-data"]');
  const statusEl = document.getElementById('importStatus');

  if (!form || !statusEl) return;

  form.theme.value = settings.theme;
  form.currency.value = settings.currency;
  form.dyslexia.checked = settings.dyslexia;
  form.reduceMotion.checked = settings.reduceMotion;

  const applyTheme = theme => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = theme === 'dark' || (theme === 'auto' && prefersDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  };

  form?.addEventListener('change', async event => {
    const field = event.target;
    const { name, type } = field;
    const value = type === 'checkbox' ? field.checked : field.value;
    await onSettingChange(name, value);
    emitSettingChange(name, value);
    if (name === 'theme') applyTheme(value);
    if (name === 'currency') {
      setStatusText('#importStatus', `Mata uang disetel ke ${value}.`);
    }
    if (name === 'dyslexia') applyDyslexiaMode(value);
    if (name === 'reduceMotion') applyReducedMotion(value);
  });

  exportBtn?.addEventListener('click', async () => {
    const data = await exportData();
    downloadJSON(data, `uangsaku-backup-${new Date().toISOString().slice(0, 10)}.json`);
    statusEl.textContent = 'Data berhasil diekspor.';
  });

  importInput?.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      await importData(JSON.parse(text));
      statusEl.textContent = 'Impor berhasil. Memuat ulang...';
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      statusEl.textContent = 'Gagal mengimpor. Pastikan file sesuai.';
    }
  });

  resetBtn?.addEventListener('click', async () => {
    if (confirm('Semua data akan dihapus permanen. Lanjutkan?')) {
      await resetAllData();
      window.location.reload();
    }
  });
}
