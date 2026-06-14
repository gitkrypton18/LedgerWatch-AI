// frontend/src/tests/pages/Dashboard.test.jsx
// Component tests for Dashboard page

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Dashboard from '../../pages/Dashboard';

vi.mock('../../hooks/useApi', () => ({
    useHealth: () => ({
        data: { status: 'ok', version: '1.0.0', model_loaded: true },
        isLoading: false,
        error: null,
    }),
    useStats: () => ({
        data: {
            total_transactions: 10000,
            anomalies_detected: 150,
            anomaly_rate: 1.5,
            avg_risk_score: 35.5,
            risk_distribution: { Low: 8000, Medium: 1500, High: 400, Critical: 100 },
        },
        isLoading: false,
        error: null,
    }),
    useTransactions: () => ({
        data: {
            transactions: [
                {
                    id: 1,
                    type: 'TRANSFER',
                    amount: 10000,
                    risk_score: 85,
                    is_anomaly: true,
                    timestamp: '2024-01-01T00:00:00Z',
                },
            ],
            count: 1,
        },
        isLoading: false,
        error: null,
    }),
}));

const createWrapper = () => {
    const queryClient = new QueryClient();
    return ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('Dashboard', () => {
    it('renders dashboard title', () => {
        render(<Dashboard />, { wrapper: createWrapper() });
        expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    });

    it('displays API status indicator', () => {
        render(<Dashboard />, { wrapper: createWrapper() });
        expect(screen.getByText(/API Online/i)).toBeInTheDocument();
    });

    it('shows KPI cards with correct data', () => {
        render(<Dashboard />, { wrapper: createWrapper() });
        expect(screen.getByText(/10,000/)).toBeInTheDocument();
        expect(screen.getByText(/150/)).toBeInTheDocument();
        expect(screen.getByText(/1.5%/)).toBeInTheDocument();
    });

    it('renders recent transactions table', () => {
        render(<Dashboard />, { wrapper: createWrapper() });
        expect(screen.getByText(/Recent Transactions/i)).toBeInTheDocument();
        expect(screen.getByText(/TRANSFER/)).toBeInTheDocument();
    });
});
