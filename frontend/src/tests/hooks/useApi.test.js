// frontend/src/tests/hooks/useApi.test.js
// Tests for React hooks in useApi.js

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHealth, useStats, useTransactions } from '../../hooks/useApi';

// Mock axios methods and config module exports
vi.mock('../../lib/axios', () => {
    const mockApi = {
        get: vi.fn(),
        post: vi.fn(),
    };
    return {
        default: mockApi,
        checkHealth: vi.fn(),
        getTransactions: vi.fn(),
        getTransactionById: vi.fn(),
        predict: vi.fn(),
        batchPredict: vi.fn(),
        ocrUpload: vi.fn(),
    };
});

import api, { checkHealth, getTransactions } from '../../lib/axios';

describe('useHealth', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns health data on success', async () => {
        const mockHealth = { status: 'ok', version: '1.0.0', model_loaded: true };
        checkHealth.mockResolvedValueOnce(mockHealth);

        const { result } = renderHook(() => useHealth(999999));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.online).toBe(true);
        expect(result.current.data).toEqual(mockHealth);
        expect(result.current.error).toBeNull();
    });

    it('returns error on failure', async () => {
        checkHealth.mockRejectedValueOnce(new Error('Network Error'));

        const { result } = renderHook(() => useHealth(999999));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.online).toBe(false);
        expect(result.current.error).toBe('Network Error');
        expect(result.current.data).toBeNull();
    });
});

describe('useStats', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('fetches stats successfully', async () => {
        const mockStats = {
            total_transactions: 1000,
            anomalies_detected: 50,
            anomaly_rate: 5.0,
            avg_risk_score: 42.5,
        };

        api.get.mockResolvedValueOnce({ data: mockStats });

        const { result } = renderHook(() => useStats());

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.data).toEqual(mockStats);
        expect(result.current.error).toBeNull();
    });
});

describe('useTransactions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('fetches paginated transactions', async () => {
        const mockData = {
            transactions: [
                { id: 1, type: 'TRANSFER', amount: 100, risk_score: 75 },
                { id: 2, type: 'PAYMENT', amount: 50, risk_score: 15 },
            ],
            count: 2,
        };

        getTransactions.mockResolvedValueOnce(mockData);

        const { result } = renderHook(() => useTransactions(10, 0));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.transactions).toHaveLength(2);
        expect(result.current.count).toBe(2);
        expect(result.current.error).toBeNull();
    });
});
