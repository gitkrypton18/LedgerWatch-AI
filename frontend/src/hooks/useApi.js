import { useCallback, useEffect, useState } from 'react';
import api, {
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
    const [isBlocked, setIsBlocked] = useState(false);

    const check = useCallback(async () => {
        try {
            const result = await checkHealth();
            setOnline(result?.status === 'ok');
            setData(result);
            setError(null);
            setIsBlocked(false);
        } catch (err) {
            setOnline(false);
            setError(err.message || 'Connection failed');
            setIsBlocked(err.isAdBlocker || false);
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        check();
        const interval = setInterval(check, pollInterval);
        return () => clearInterval(interval);
    }, [check, pollInterval]);

    return { online, data, loading, error, isBlocked, check };
};

// ─── useStats ─────────────────────────────────────────────────
// ✅ FIX: Use axios instance instead of hardcoded fetch
export const useStats = (trigger) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const fetchStats = async () => {
            try {
                setLoading(true);
                // ✅ FIX: Use axios instance — respects env vars + headers
                const result = await api.get('/stats');
                if (!cancelled) setData(result.data);
            } catch (err) {
                if (!cancelled) {
                    setError(err.userMessage || err.message || 'Failed to fetch stats');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchStats();
        return () => { cancelled = true; };
    }, [trigger]);

    return { data, loading, error };
};

// ─── useTransactions ──────────────────────────────────────────
export const useTransactions = (limit = 10, offset = 0, trigger) => {
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
                if (!cancelled) setError(err.userMessage || err.message || 'Failed to fetch');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetch();
        return () => { cancelled = true; };
    }, [limit, offset, trigger]);

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
            .catch(err => {
                if (!cancelled) setError(err.userMessage || err.message);
            })
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
            setError(err.userMessage || err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { result: data, loading, error, predict: runPredict };
};

// ─── useBatchPredict ──────────────────────────────────────────
// ✅ FIX: Add progress tracking
export const useBatchPredict = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);  // ✅ NEW: Upload progress %

    const upload = useCallback(async (file) => {
        setLoading(true);
        setError(null);
        setProgress(0);  // ✅ Reset progress

        try {
            // ✅ FIX: Pass progress callback
            const result = await batchPredict(file, (percent) => {
                setProgress(percent);
            });
            setData(result);
            setProgress(100);  // ✅ Complete
            return result;
        } catch (err) {
            setError(err.userMessage || err.message);
            setProgress(0);  // ✅ Reset on error
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { result: data, loading, error, progress, upload };  // ✅ Return progress
};

// ─── useOCR ───────────────────────────────────────────────────
export const useOCR = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);  // ✅ NEW: Upload progress %

    const upload = useCallback(async (file) => {
        setLoading(true);
        setError(null);
        setProgress(0);

        try {
            const result = await ocrUpload(file, (percent) => {
                setProgress(percent);
            });
            setData(result);
            setProgress(100);
            return result;
        } catch (err) {
            setError(err.userMessage || err.message);
            setProgress(0);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { result: data, loading, error, progress, upload };
};

// ─── useRetrain ───────────────────────────────────────────────
export const useRetrain = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const retrain = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const query = new URLSearchParams(params).toString();
            const url = `/retrain${query ? `?${query}` : ''}`;
            const result = await api.post(url);
            setData(result.data);
            return result.data;
        } catch (err) {
            setError(err.userMessage || err.message || 'Retraining failed');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { result: data, loading, error, retrain };
};

// ─── useMockFallback ──────────────────────────────────────────
export const useMockFallback = (apiData, mockData) => {
    const [useMock, setUseMock] = useState(false);
    return { data: useMock ? mockData : apiData, useMock, setUseMock };
};
