import axios from 'axios';

// Read from localStorage first so the Settings page actually takes effect
const storedUrl = localStorage.getItem('ledgerwatch_apiUrl');
const API_URL = storedUrl || import.meta.env.VITE_API_URL || 'https://ledgerwatch-api.onrender.com';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 300000,
});

// Request interceptor — remove Content-Type for FormData, and add Auth token
api.interceptors.request.use((config) => {
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type']; // Let browser set it with boundary
    }
    
    // Inject the JWT token if available
    const token = localStorage.getItem('ledgerwatch_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (!error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error')) {
            error.isAdBlocker = true;
            error.userMessage = 'Connection blocked! Please disable ad blocker or try incognito mode.';
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

export const batchPredict = async (file, onProgress = null) => {
    const formData = new FormData();
    formData.append('file', file);

    const config = {
        onUploadProgress: onProgress ? (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
        } : undefined,
    };

    const { data } = await api.post('/batch-predict', formData, config);
    return data;
};

export const ocrUpload = async (file, onProgress = null) => {
    const formData = new FormData();
    formData.append('file', file);

    const config = {
        onUploadProgress: onProgress ? (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
        } : undefined,
    };

    const { data } = await api.post('/ocr', formData, config);
    return data;
};

export default api;
