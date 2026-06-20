// frontend/src/tests/pages/Dashboard.test.jsx
// Component tests for Dashboard page

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Dashboard from '../../pages/Dashboard';

vi.mock('../../hooks/useApi', () => ({
    useHealth: () => ({
        online: true,
        data: { status: 'ok', version: '1.0.0', model_loaded: true },
        loading: false,
        error: null,
    }),
    useStats: () => ({
        data: {
            total_transactions: 10000,
            anomalies_detected: 150,
            anomaly_rate: 0.015,
            avg_risk_score: 35.5,
            risk_distribution: { Low: 8000, Medium: 1500, High: 400, Critical: 100 },
        },
        loading: false,
        error: null,
    }),
    useTransactions: () => ({
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
        loading: false,
        error: null,
    }),
}));

describe('Dashboard', () => {
    it('renders dashboard title', () => {
        render(<MemoryRouter><Dashboard /></MemoryRouter>);
        expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    });

    it('displays API status indicator', () => {
        render(<MemoryRouter><Dashboard /></MemoryRouter>);
        expect(screen.getByText(/API Online/i)).toBeInTheDocument();
    });

    it('shows KPI cards with correct data', () => {
        render(<MemoryRouter><Dashboard /></MemoryRouter>);
        expect(screen.getAllByText(/10,000/).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/150/)).toBeInTheDocument();
        expect(screen.getByText(/1.500%/)).toBeInTheDocument();
    });

    it('renders recent transactions table', () => {
        render(<MemoryRouter><Dashboard /></MemoryRouter>);
        expect(screen.getByText(/Recent High-Risk Transactions/i)).toBeInTheDocument();
        expect(screen.getByText(/TRANSFER/)).toBeInTheDocument();
    });
});
