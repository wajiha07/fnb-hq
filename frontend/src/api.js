const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://127.0.0.1:4000/api' : '/api');

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      'API returned a non-JSON response. Is the backend running on port 4000?'
    );
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body.message || `Request failed (${res.status})`;
    const err = new Error(message);
    err.details = body.details;
    throw err;
  }
  if (!body.success) {
    throw new Error(body.message || 'Unexpected API response');
  }
  return body.data ?? [];
}

export const api = {
  getCompanies: () => request('/companies'),
  getOutlets: (companyId) => request(`/outlets?companyId=${companyId}`),
  createOutlet: (payload) =>
    request('/outlets', { method: 'POST', body: JSON.stringify(payload) }),
  getMasterMenu: (companyId) => request(`/menu?companyId=${companyId}`),
  createMenuItem: (payload) =>
    request('/menu', { method: 'POST', body: JSON.stringify(payload) }),
  assignMenu: (payload) =>
    request('/menu/assign', { method: 'POST', body: JSON.stringify(payload) }),
  getOutletMenu: (outletId) => request(`/menu/outlet/${outletId}`),
  getInventory: (outletId) => request(`/outlets/${outletId}/inventory`),
  setInventory: (outletId, payload) =>
    request(`/outlets/${outletId}/inventory`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  createSale: (outletId, items) =>
    request(`/outlets/${outletId}/sales`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  getRevenue: (companyId) => request(`/reports/revenue?companyId=${companyId}`),
  getTopItems: (outletId) =>
    request(`/reports/outlets/${outletId}/top-items?limit=5`),
};
