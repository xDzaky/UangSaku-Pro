const registry = new Map();
let chartLoader;

async function ensureChartJs() {
  if (window.Chart) return window.Chart;
  if (!chartLoader) {
    chartLoader = import('https://cdn.jsdelivr.net/npm/chart.js@4.4.6/dist/chart.umd.min.js').then(mod => mod.Chart || window.Chart);
  }
  return chartLoader;
}

function destroyIfExists(key) {
  const chart = registry.get(key);
  if (chart) {
    chart.destroy();
    registry.delete(key);
  }
}

export async function renderDoughnut(canvas, payload) {
  const Chart = await ensureChartJs();
  destroyIfExists(canvas.id);
  const chart = new Chart(canvas, {
    type: 'doughnut',
    data: payload,
    options: {
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.formattedValue}` } }
      }
    }
  });
  registry.set(canvas.id, chart);
  return chart;
}

export async function renderLine(canvas, payload) {
  const Chart = await ensureChartJs();
  destroyIfExists(canvas.id);
  const chart = new Chart(canvas, {
    type: 'line',
    data: payload,
    options: {
      responsive: true,
      tension: 0.3,
      plugins: { legend: { display: false } },
      interaction: { intersect: false, mode: 'index' }
    }
  });
  registry.set(canvas.id, chart);
  return chart;
}

export async function renderBar(canvas, payload) {
  const Chart = await ensureChartJs();
  destroyIfExists(canvas.id);
  const chart = new Chart(canvas, {
    type: 'bar',
    data: payload,
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: true } }
    }
  });
  registry.set(canvas.id, chart);
  return chart;
}

export function destroyCharts() {
  registry.forEach(chart => chart.destroy());
  registry.clear();
}
