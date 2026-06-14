// frontend/src/tests/hooks/useApi.test.js
// Tests for React hooks in useApi.js

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHealth, useStats, useTransactions } from '../../hooks/useApi';

// Mock axios
vi.mock('../../lib/axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

import axios from '../../lib/axios';

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('useHealth', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns health data on success', async () => {
        axios.get.mockResolvedValueOnce({
            data: { status: 'ok', version: '1.0.0', model_loaded: true },
        });

        const { result } = renderHook(() => useHealth(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual({
            status: 'ok',
            version: '1.0.0',
            model_loaded: true,
        });
    });

    it('returns error on failure', async () => {
        axios.get.mockRejectedValueOnce(new Error('Network Error'));

        const { result } = renderHook(() => useHealth(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toBeDefined();
    });
});

describe('useStats', () => {
    it('fetches stats successfully', async () => {
        const mockStats = {
            total_transactions: 1000,
            anomalies_detected: 50,
            anomaly_rate: 5.0,
            avg_risk_score: 42.5,
        };

        axios.get.mockResolvedValueOnce({ data: mockStats });

        const { result } = renderHook(() => useStats(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockStats);
    });
});

describe('useTransactions', () => {
    it('fetches paginated transactions', async () => {
        const mockData = {
            transactions: [
                { id: 1, type: 'TRANSFER', amount: 100, risk_score: 75 },
                { id: 2, type: 'PAYMENT', amount: 50, risk_score: 15 },
            ],
            count: 2,
        };

        axios.get.mockResolvedValueOnce({ data: mockData });

        const { result } = renderHook(() => useTransactions(10, 0), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data.transactions).toHaveLength(2);
        expect(result.current.data.count).toBe(2);
    });
});
