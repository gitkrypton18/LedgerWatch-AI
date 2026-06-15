import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || 'https://ledgerwatch-api.onrender.com';
const API_KEY = import.meta.env.VITE_API_KEY || 'demo-key-123';
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  },
});

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
