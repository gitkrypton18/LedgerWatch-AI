import { useCallback, useEffect, useState } from 'react';
import {
    batchPredict,
    checkHealth,
    getTransactionById,
    getTransactions,
    ocrUpload,
    predict
} from '../lib/axios';

// ─── useHealth ────────────────────────────────────────────────
export const useHealth = (pollInterval = 30000) => {
    const [online, setOnline] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const check = useCallback(async () => {
        try {
            const result = await checkHealth();
            setOnline(result?.status === 'ok');
            setData(result);
            setError(null);
        } catch (err) {
            setOnline(false);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        check();
        const interval = setInterval(check, pollInterval);
        return () => clearInterval(interval);
    }, [check, pollInterval]);

    return { online, data, loading, error, check };
};

// ─── useStats ─────────────────────────────────────────────────
export const useStats = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch('http://localhost:8000/stats', {
            headers: { 'X-API-Key': import.meta.env.VITE_API_KEY || 'demo-key-123' }
        })
            .then(r => r.json())
            .then(setData)
            .catch(setError)
            .finally(() => setLoading(false));
    }, []);

    return { data, loading, error };
};

// ─── useTransactions ──────────────────────────────────────────
export const useTransactions = (limit = 10, offset = 0) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const fetch = async () => {
            try {
                setLoading(true);
                const result = await getTransactions(limit, offset);
                if (!cancelled) setData(result);
            } catch (err) {
                if (!cancelled) setError(err.message || 'Failed to fetch');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetch();
        return () => { cancelled = true; };
    }, [limit, offset]);

    return {
        transactions: data?.transactions || [],
        count: data?.count || 0,
        loading,
        error,
        refetch: () => window.location.reload(),
    };
};

// ─── useTransaction ───────────────────────────────────────────
export const useTransaction = (id) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(!!id);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;

        getTransactionById(id)
            .then(result => { if (!cancelled) setData(result); })
            .catch(err => { if (!cancelled) setError(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [id]);

    return { transaction: data, loading, error };
};

// ─── usePredict ─────────────────────────────────────────────
export const usePredict = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const runPredict = useCallback(async (transactionData, explain = false) => {
        setLoading(true);
        setError(null);
        try {
            const result = await predict(transactionData, explain);
            setData(result);
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { result: data, loading, error, predict: runPredict };
};

// ─── useBatchPredict ──────────────────────────────────────────
export const useBatchPredict = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const upload = useCallback(async (file) => {
        setLoading(true);
        setError(null);
        try {
            const result = await batchPredict(file);
            setData(result);
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { result: data, loading, error, upload };
};

// ─── useOCR ───────────────────────────────────────────────────
export const useOCR = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const upload = useCallback(async (file) => {
        setLoading(true);
        setError(null);
        try {
            const result = await ocrUpload(file);
            setData(result);
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { result: data, loading, error, upload };
};

// ─── useMockFallback ──────────────────────────────────────────
export const useMockFallback = (apiData, mockData) => {
    const [useMock, setUseMock] = useState(false);
    return { data: useMock ? mockData : apiData, useMock, setUseMock };
};
