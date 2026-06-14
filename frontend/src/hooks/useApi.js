// ─────────────────────────────────────────────────────────────
// LedgerWatch AI — React Hooks for API Integration
// Day 14: Custom hooks wrapping axios calls with state management
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import {
    batchPredict,
    checkHealth,
    getStats,
    getTransactionById,
    getTransactions,
    ocrUpload,
    predict,
} from '../lib/axios';

/**
 * Generic hook pattern: [data, loading, error, refetch]
 */
const useApiCall = (apiFn, immediate = true) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(immediate);
    const [error, setError] = useState(null);

    const execute = useCallback(
        async (...args) => {
            setLoading(true);
            setError(null);
            try {
                const result = await apiFn(...args);
                setData(result);
                return result;
            } catch (err) {
                const msg = err.message || err.response?.data?.detail || 'Unknown error';
                setError(msg);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [apiFn]
    );

    useEffect(() => {
        if (immediate) {
            execute();
        }
    }, [execute, immediate]);

    return { data, loading, error, execute, setData };
};

// ─── useHealth ────────────────────────────────────────────────
// Polls /health every 30 seconds. Returns { online, data, error }
export const useHealth = (pollInterval = 30000) => {
    const [online, setOnline] = useState(false);
    const { data, loading, error, execute } = useApiCall(checkHealth, false);

    const check = useCallback(async () => {
        try {
            const result = await execute();
            setOnline(result?.status === 'ok');
            return result;
        } catch {
            setOnline(false);
            return null;
        }
    }, [execute]);

    useEffect(() => {
        check(); // Initial check
        const interval = setInterval(check, pollInterval);
        return () => clearInterval(interval);
    }, [check, pollInterval]);

    return { online, data, loading, error, check };
};

// ─── useStats ─────────────────────────────────────────────────
export const useStats = () => {
    return useApiCall(getStats, true);
};

// ─── useTransactions ──────────────────────────────────────────
export const useTransactions = (limit = 10, offset = 0) => {
    const { data, loading, error, execute } = useApiCall(
        () => getTransactions(limit, offset),
        true
    );

    // Refetch when limit or offset changes
    useEffect(() => {
        execute();
    }, [limit, offset, execute]);

    return {
        transactions: data?.transactions || [],
        count: data?.count || 0,
        loading,
        error,
        refetch: execute,
    };
};

// ─── useTransaction ───────────────────────────────────────────
export const useTransaction = (id) => {
    const { data, loading, error, execute } = useApiCall(
        () => getTransactionById(id),
        !!id // Only fetch if id is provided
    );

    return { transaction: data, loading, error, refetch: execute };
};

// ─── usePredict ─────────────────────────────────────────────
export const usePredict = () => {
    const { data, loading, error, execute } = useApiCall(predict, false);

    const runPredict = useCallback(
        async (transactionData, explain = false) => {
            return await execute(transactionData, explain);
        },
        [execute]
    );

    return { result: data, loading, error, predict: runPredict, setResult: useApiCall(predict, false).setData };
};

// ─── useBatchPredict ──────────────────────────────────────────
export const useBatchPredict = () => {
    const { data, loading, error, execute } = useApiCall(batchPredict, false);

    const upload = useCallback(
        async (file) => {
            return await execute(file);
        },
        [execute]
    );

    return { result: data, loading, error, upload };
};

// ─── useOCR ───────────────────────────────────────────────────
export const useOCR = () => {
    const { data, loading, error, execute } = useApiCall(ocrUpload, false);

    const upload = useCallback(
        async (file) => {
            return await execute(file);
        },
        [execute]
    );

    return { result: data, loading, error, upload };
};

// ─── useMockFallback ──────────────────────────────────────────
// Returns mock data when API is offline (for demo purposes)
export const useMockFallback = (apiData, mockData) => {
    const [useMock, setUseMock] = useState(false);

    useEffect(() => {
        if (apiData === null && !useMock) {
            // Could auto-switch to mock, but we'll let user decide
        }
    }, [apiData, useMock]);

    return {
        data: useMock ? mockData : apiData,
        useMock,
        setUseMock,
    };
};
