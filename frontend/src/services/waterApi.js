const API_BASE = (import.meta.env.VITE_WATER_API_URL || '/api').replace(/\/$/, '');

async function request(path, options) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { Accept: 'application/json', ...options?.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.error?.message || `Water API request failed (${response.status}).`);
    error.code = body?.error?.code || 'HTTP_ERROR';
    error.status = response.status;
    throw error;
  }
  return body;
}

export const waterApi = {
  areas: () => request('/areas'),
  area: (id) => request(`/areas/${encodeURIComponent(id)}`),
  areaSensors: (id) => request(`/areas/${encodeURIComponent(id)}/sensors`),
  sensors: () => request('/sensors'),
  sensor: (id) => request(`/sensors/${encodeURIComponent(id)}`),
  locations: () => request('/map/locations'),
  latest: (filters = {}) => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    return request(`/readings/latest${query.size ? `?${query}` : ''}`);
  },
  history: (filters = {}) => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined && value !== null));
    return request(`/readings/history${query.size ? `?${query}` : ''}`);
  },
  areaLatest: (id) => request(`/areas/${encodeURIComponent(id)}/readings/latest`),
  areaHistory: (id, filters = {}) => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined && value !== null));
    return request(`/areas/${encodeURIComponent(id)}/readings${query.size ? `?${query}` : ''}`);
  },
  sensorLatest: (id) => request(`/sensors/${encodeURIComponent(id)}/readings/latest`),
  sensorHistory: (id, filters = {}) => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined && value !== null));
    return request(`/sensors/${encodeURIComponent(id)}/readings${query.size ? `?${query}` : ''}`);
  },
};

/** Subscribe to normalized server events. Call the returned function to close. */
export function subscribeToWaterUpdates({ areaId, sensorId, onEvent, onError }) {
  const query = new URLSearchParams({ ...(areaId ? { areaId } : {}), ...(sensorId ? { sensorId } : {}) });
  const url = `${API_BASE}/realtime${query.size ? `?${query}` : ''}`;
  let source;
  let stopped = false;
  let retry = 1000;
  let timer;
  const connect = () => {
    if (stopped) return;
    source = new EventSource(url);
    source.onopen = () => { retry = 1000; };
    source.onmessage = (message) => {
      try { onEvent(JSON.parse(message.data)); } catch (error) { onError?.(error); }
    };
    source.onerror = () => {
      source.close();
      onError?.(new Error('Water data connection interrupted; reconnecting.'));
      timer = window.setTimeout(connect, retry);
      retry = Math.min(retry * 2, 30000);
    };
  };
  connect();
  return () => { stopped = true; window.clearTimeout(timer); source?.close(); };
}
