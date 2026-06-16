import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://ledgerwatch-api.onrender.com';
const API_KEY = import.meta.env.VITE_API_KEY || 'demo-key-123';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  },
  timeout: 300000, // 5 minutes timeout for batch predictions
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

// ✅ FIX: batchPredict with progress callback
export const batchPredict = async (file, onProgress = null) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const config = {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress ? (progressEvent) => {
      const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      onProgress(percent);
    } : undefined,
  };
  
  const { data } = await api.post('/batch-predict', formData, config);
  return data;
};

// ✅ FIX: ocrUpload with progress callback
export const ocrUpload = async (file, onProgress = null) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const config = {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress ? (progressEvent) => {
      const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      onProgress(percent);
    } : undefined,
  };
  
  const { data } = await api.post('/ocr', formData, config);
  return data;
};

export default api;
