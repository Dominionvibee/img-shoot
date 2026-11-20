const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? '';
const baseUrl = configuredBaseUrl.replace(/\/$/, '');

export async function apiRequest(path, options = {}) {
  if (!path.startsWith('/api/')) {
    throw new TypeError('API paths must begin with /api/.');
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || `API request failed (${response.status}).`);
  }
  return body;
}
