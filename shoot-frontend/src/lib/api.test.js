import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './api.js';

afterEach(() => vi.unstubAllGlobals());

describe('apiRequest', () => {
  it('uses the same-origin API proxy and decodes JSON', async () => {
    const payload = { status: 'ok' };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => payload });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/api/health')).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith('/api/health', expect.objectContaining({
      headers: { Accept: 'application/json' },
    }));
  });

  it('rejects paths outside the API namespace', async () => {
    await expect(apiRequest('/admin')).rejects.toThrow('API paths must begin with /api/.');
  });

  it('reports API failures without hiding the server message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ message: 'Service unavailable.' }),
    }));

    await expect(apiRequest('/api/health')).rejects.toThrow('Service unavailable.');
  });
});
