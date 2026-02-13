import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// --- Data generation ---
export function generateData(config = {}) {
  return api.post('/data/generate', config).then((r) => r.data);
}

// --- Waiting list ---
export function getWaitingList(params = {}) {
  return api.get('/data/waiting-list', { params }).then((r) => r.data);
}

// --- Statistics ---
export function getStatistics() {
  return api.get('/data/statistics').then((r) => r.data);
}

// --- Export dataset (returns blob for download) ---
export function exportData(type) {
  return api.get(`/data/export/${type}`, { responseType: 'blob' }).then((r) => r.data);
}

// --- Import dataset ---
export function importData(type, data, replace = false) {
  return api.post(`/data/import/${type}`, { data, replace }).then((r) => r.data);
}

// --- Predictions ---
export function runPrediction(cutoffDate, include = {}) {
  return api.post('/prediction/run', { cutoffDate, include }).then((r) => r.data);
}

export function getLatestPrediction() {
  return api.get('/prediction/latest').then((r) => r.data);
}

export function getPredictionHistory(params = {}) {
  return api.get('/prediction/history', { params }).then((r) => r.data);
}

// --- Health ---
export function getHealth() {
  return api.get('/health').then((r) => r.data);
}

export default api;
