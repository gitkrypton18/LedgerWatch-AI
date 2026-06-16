import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://ledgerwatch-api.onrender.com';
const API_KEY = import.meta.env.VITE_API_KEY || 'demo-key-123';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  },
  timeout: 60000, // 60 seconds timeout
});

// Response interceptor for ad-blocker detection
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error')) {
      console.error('🔴 Network Error — Possible causes:');
      console.error('   1. Ad blocker / Brave Shields blocking the request');
      console.error('   2. Backend is sleeping (Render free tier)');
      console.error('   3. CORS issue');
      console.error('💡 FIX: Disable ad blocker for this site or try incognito mode');

      error.isAdBlocker = true;
      error.userMessage = 'Connection blocked by ad blocker or Brave Shields! Please disable extensions for this site, then refresh.';
    }
    return Promise.reject(error);
  }
);

export const checkHealth = async () => {
  const { data } = await api.get('/health');
  return data;
};

export const getTransactions = async (limit = 100, offset = 0) => {
  const { data } = await api.get(`/transactions?limit=${limit}&offset=${offset}`);
  return data;
};

export const getTransactionById = async (id) => {
  const { data } = await api.get(`/transactions/${id}`);
  return data;
};

export const predict = async (transactionData, explain = true) => {
  const { data } = await api.post(`/predict?explain=${explain}`, transactionData);
  return data;
};

export const batchPredict = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/batch-predict', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const ocrUpload = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/ocr', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export default api;
