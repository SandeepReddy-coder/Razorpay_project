// API base URL
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = {
  health: () => fetch(`${API_BASE}/api/health`).then(r => r.json()),
  metrics: () => fetch(`${API_BASE}/api/metrics`).then(r => r.json()),
  alerts: (limit = 50) => fetch(`${API_BASE}/api/alerts?limit=${limit}`).then(r => r.json()),
  score: (data) => fetch(`${API_BASE}/api/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => r.json()),
  transactionDetail: (id) => fetch(`${API_BASE}/api/transaction/${id}`).then(r => r.json()),
  demoTransactions: () => fetch(`${API_BASE}/api/demo-transactions`).then(r => r.json()),
  streamUrl: () => `${API_BASE}/api/stream`,
};
