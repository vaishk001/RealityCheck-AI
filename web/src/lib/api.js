import axios from 'axios';

export const api = axios.create({
  baseURL: '',
  timeout: 20000
});

export async function scanText(text) {
  const res = await api.post('/api/scan-text', { text });
  return res.data;
}

export async function scanUrl(url) {
  const res = await api.post('/api/scan-url', { url });
  return res.data;
}

export async function scanFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await api.post('/api/scan-file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return res.data;
}

export async function getHistory(limit = 5) {
  const res = await api.get('/api/history', { params: { limit } });
  return res.data;
}

export async function getSystemStatus() {
  const res = await api.get('/api/status');
  return res.data;
}

export async function getBackendHealth() {
  const res = await api.get('/health');
  return res.data;
}

export async function getThreats(params = {}) {
  const res = await api.get('/api/threats', { params });
  return res.data;
}

export async function reportThreat(payload) {
  const res = await api.post('/api/report', payload);
  return res.data;
}

export async function voteThreat(id) {
  const res = await api.post(`/api/threats/${id}/vote`);
  return res.data;
}
