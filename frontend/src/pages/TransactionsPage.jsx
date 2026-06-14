import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  TrendingUp,
  WifiOff,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTransactions } from '../hooks/useApi';

// ─── Type Icons & Colors ──────────────────────────────────────
const TYPE_CONFIG = {
  TRANSFER: { color: 'bg-purple-500/20 text-purple-400', icon: '↔' },
  CASH_OUT: { color: 'bg-amber-500/20 text-amber-400', icon: '↓' },
  CASH_IN: { color: 'bg-emerald-500/20 text-emerald-400', icon: '↑' },
  PAYMENT: { color: 'bg-blue-500/20 text-blue-400', icon: '💳' },
  DEBIT: { color: 'bg-indigo-500/20 text-indigo-400', icon: '−' },
};

// ─── Rich Mock Data (50 records) ────────────────────────────
const MOCK_TRANSACTIONS = [
  { id: 1, step: 1, type: 'TRANSFER', amount: 181, nameOrig: 'C1231006815', oldbalanceOrg: 181, newbalanceOrig: 0, nameDest: 'C1970109150', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 99, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.6213, shap_values: { is_round_amount: 1.6856, type_TRANSFER: 1.1378, hour_of_step: 0.8483, hour_of_step_cos: 0.7902, is_new_dest: 0.2155 } },
  { id: 2, step: 1, type: 'TRANSFER', amount: 181, nameOrig: 'C1669944498', oldbalanceOrg: 181, newbalanceOrig: 0, nameDest: 'C2048539020', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 99, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.5987, shap_values: { is_round_amount: 1.6234, type_TRANSFER: 1.0987, hour_of_step: 0.8123, is_new_dest: 0.1987, balance_diff_orig: 0.1765 } },
  { id: 3, step: 1, type: 'CASH_OUT', amount: 229133.94, nameOrig: 'C905333901', oldbalanceOrg: 15325, newbalanceOrig: 0, nameDest: 'M573053279', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 87, risk_band: 'High', is_anomaly: true, anomaly_score: -0.4123, shap_values: { amount_log: 0.9876, is_balance_zeroed_orig: 0.8765, type_CASH_OUT: 0.6543, hour_of_step: 0.4321 } },
  { id: 4, step: 2, type: 'PAYMENT', amount: 11668.14, nameOrig: 'C12345', oldbalanceOrg: 41554, newbalanceOrig: 29885.86, nameDest: 'M123', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 12, risk_band: 'Low', is_anomaly: false, anomaly_score: 0.2341, shap_values: { type_PAYMENT: -0.5432, amount_log: -0.4321, is_new_dest: -0.1234 } },
  { id: 5, step: 2, type: 'PAYMENT', amount: 7879.43, nameOrig: 'C67890', oldbalanceOrg: 108195, newbalanceOrig: 100315.57, nameDest: 'M456', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 8, risk_band: 'Low', is_anomaly: false, anomaly_score: 0.3124, shap_values: { type_PAYMENT: -0.6123, amount_log: -0.3456, hour_of_step_sin: -0.2345 } },
  { id: 6, step: 2, type: 'TRANSFER', amount: 420000, nameOrig: 'C99999', oldbalanceOrg: 420000, newbalanceOrig: 0, nameDest: 'C88888', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 100, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.7123, shap_values: { is_round_amount: 1.8765, type_TRANSFER: 1.2345, amount_log: 1.1234, is_balance_zeroed_orig: 0.9876, is_new_dest: 0.5432 } },
  { id: 7, step: 3, type: 'CASH_OUT', amount: 102300, nameOrig: 'C77777', oldbalanceOrg: 102300, newbalanceOrig: 0, nameDest: 'M99999', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 96, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.5678, shap_values: { is_balance_zeroed_orig: 1.2345, amount_log: 0.9876, type_CASH_OUT: 0.8765, hour_of_step: 0.6543 } },
  { id: 8, step: 3, type: 'DEBIT', amount: 5337.77, nameOrig: 'C11111', oldbalanceOrg: 63772, newbalanceOrig: 58434.23, nameDest: 'C22222', oldbalanceDest: 0, newbalanceDest: 5337.77, isFraud: 0, risk_score: 22, risk_band: 'Low', is_anomaly: false, anomaly_score: 0.1876, shap_values: { type_DEBIT: -0.3456, amount_log: -0.2345, balance_diff_dest: 0.1234 } },
  { id: 9, step: 4, type: 'CASH_IN', amount: 50000, nameOrig: 'C33333', oldbalanceOrg: 0, newbalanceOrig: 50000, nameDest: 'C44444', oldbalanceDest: 100000, newbalanceDest: 50000, isFraud: 0, risk_score: 5, risk_band: 'Low', is_anomaly: false, anomaly_score: 0.4567, shap_values: { type_CASH_IN: -0.8765, is_new_orig: -0.5432, amount_log: -0.4321 } },
  { id: 10, step: 4, type: 'TRANSFER', amount: 250000, nameOrig: 'C55555', oldbalanceOrg: 250000, newbalanceOrig: 0, nameDest: 'C66666', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 98, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.6543, shap_values: { is_round_amount: 1.5432, type_TRANSFER: 1.0987, is_balance_zeroed_orig: 0.9876, amount_log: 0.8765 } },
  { id: 11, step: 5, type: 'PAYMENT', amount: 21942.23, nameOrig: 'C12121', oldbalanceOrg: 2415, newbalanceOrig: 0, nameDest: 'M789', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 45, risk_band: 'Medium', is_anomaly: false, anomaly_score: 0.0234, shap_values: { is_balance_zeroed_orig: 0.4567, type_PAYMENT: -0.3456, amount_log: 0.2345 } },
  { id: 12, step: 5, type: 'CASH_OUT', amount: 89543.21, nameOrig: 'C13131', oldbalanceOrg: 90000, newbalanceOrig: 456.79, nameDest: 'M10101', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 67, risk_band: 'Medium', is_anomaly: true, anomaly_score: -0.1234, shap_values: { amount_log: 0.6543, type_CASH_OUT: 0.5432, is_balance_zeroed_orig: 0.2345 } },
  { id: 13, step: 6, type: 'TRANSFER', amount: 1000000, nameOrig: 'C14141', oldbalanceOrg: 1000000, newbalanceOrig: 0, nameDest: 'C15151', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 100, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.8234, shap_values: { amount_log: 1.5432, is_round_amount: 1.4321, type_TRANSFER: 1.2345, is_balance_zeroed_orig: 1.1234, is_new_dest: 0.9876 } },
  { id: 14, step: 6, type: 'PAYMENT', amount: 1234.56, nameOrig: 'C16161', oldbalanceOrg: 5000, newbalanceOrig: 3765.44, nameDest: 'M222', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 3, risk_band: 'Low', is_anomaly: false, anomaly_score: 0.5678, shap_values: { type_PAYMENT: -0.7654, amount_log: -0.6543 } },
  { id: 15, step: 7, type: 'CASH_OUT', amount: 345678, nameOrig: 'C17171', oldbalanceOrg: 345678, newbalanceOrig: 0, nameDest: 'M333', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 97, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.5890, shap_values: { is_balance_zeroed_orig: 1.3456, amount_log: 1.0987, type_CASH_OUT: 0.9876 } },
  { id: 16, step: 7, type: 'DEBIT', amount: 8765.43, nameOrig: 'C18181', oldbalanceOrg: 15000, newbalanceOrig: 6234.57, nameDest: 'C19191', oldbalanceDest: 5000, newbalanceDest: 13765.43, isFraud: 0, risk_score: 28, risk_band: 'Low', is_anomaly: false, anomaly_score: 0.3456, shap_values: { type_DEBIT: -0.4567, amount_log: -0.3456 } },
  { id: 17, step: 8, type: 'TRANSFER', amount: 55555, nameOrig: 'C20202', oldbalanceOrg: 55555, newbalanceOrig: 0, nameDest: 'C21212', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 94, risk_band: 'High', is_anomaly: true, anomaly_score: -0.4567, shap_values: { is_round_amount: 1.2345, type_TRANSFER: 0.9876, is_balance_zeroed_orig: 0.8765 } },
  { id: 18, step: 8, type: 'CASH_IN', amount: 20000, nameOrig: 'C23232', oldbalanceOrg: 0, newbalanceOrig: 20000, nameDest: 'C24242', oldbalanceDest: 50000, newbalanceDest: 30000, isFraud: 0, risk_score: 7, risk_band: 'Low', is_anomaly: false, anomaly_score: 0.4321, shap_values: { type_CASH_IN: -0.6543, is_new_orig: -0.5432 } },
  { id: 19, step: 9, type: 'PAYMENT', amount: 99999, nameOrig: 'C25252', oldbalanceOrg: 100000, newbalanceOrig: 1, nameDest: 'M444', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 71, risk_band: 'High', is_anomaly: true, anomaly_score: -0.2345, shap_values: { is_balance_zeroed_orig: 0.8765, amount_log: 0.6543, type_PAYMENT: 0.2345 } },
  { id: 20, step: 9, type: 'TRANSFER', amount: 777777, nameOrig: 'C26262', oldbalanceOrg: 777777, newbalanceOrig: 0, nameDest: 'C27272', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 100, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.7890, shap_values: { amount_log: 1.6543, is_round_amount: 1.5432, type_TRANSFER: 1.3456, is_balance_zeroed_orig: 1.2345 } },
  { id: 21, step: 10, type: 'CASH_OUT', amount: 150000, nameOrig: 'C28282', oldbalanceOrg: 150000, newbalanceOrig: 0, nameDest: 'M555', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 95, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.5123, shap_values: { is_balance_zeroed_orig: 1.0987, amount_log: 0.9876, type_CASH_OUT: 0.8765 } },
  { id: 22, step: 10, type: 'PAYMENT', amount: 4321, nameOrig: 'C29292', oldbalanceOrg: 10000, newbalanceOrig: 5679, nameDest: 'M666', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 15, risk_band: 'Low', is_anomaly: false, anomaly_score: 0.2987, shap_values: { type_PAYMENT: -0.5432, amount_log: -0.4321 } },
  { id: 23, step: 11, type: 'DEBIT', amount: 25000, nameOrig: 'C30303', oldbalanceOrg: 50000, newbalanceOrig: 25000, nameDest: 'C31313', oldbalanceDest: 10000, newbalanceDest: 35000, isFraud: 0, risk_score: 35, risk_band: 'Medium', is_anomaly: false, anomaly_score: 0.1234, shap_values: { type_DEBIT: 0.2345, amount_log: 0.1234 } },
  { id: 24, step: 11, type: 'TRANSFER', amount: 333333, nameOrig: 'C32323', oldbalanceOrg: 333333, newbalanceOrig: 0, nameDest: 'C33333', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 99, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.6789, shap_values: { is_round_amount: 1.4567, amount_log: 1.3456, type_TRANSFER: 1.2345, is_balance_zeroed_orig: 1.1234 } },
  { id: 25, step: 12, type: 'CASH_IN', amount: 75000, nameOrig: 'C34343', oldbalanceOrg: 0, newbalanceOrig: 75000, nameDest: 'C35353', oldbalanceDest: 200000, newbalanceDest: 125000, isFraud: 0, risk_score: 4, risk_band: 'Low', is_anomaly: false, anomaly_score: 0.5432, shap_values: { type_CASH_IN: -0.8765, is_new_orig: -0.7654 } },
  { id: 26, step: 12, type: 'CASH_OUT', amount: 87654, nameOrig: 'C36363', oldbalanceOrg: 90000, newbalanceOrig: 2346, nameDest: 'M777', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 58, risk_band: 'Medium', is_anomaly: true, anomaly_score: -0.0876, shap_values: { amount_log: 0.5432, type_CASH_OUT: 0.4321 } },
  { id: 27, step: 13, type: 'PAYMENT', amount: 56789, nameOrig: 'C37373', oldbalanceOrg: 60000, newbalanceOrig: 3211, nameDest: 'M888', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 62, risk_band: 'Medium', is_anomaly: true, anomaly_score: -0.1567, shap_values: { is_balance_zeroed_orig: 0.6543, amount_log: 0.5432, type_PAYMENT: 0.2345 } },
  { id: 28, step: 13, type: 'TRANSFER', amount: 444444, nameOrig: 'C38383', oldbalanceOrg: 444444, newbalanceOrig: 0, nameDest: 'C39393', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 100, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.7345, shap_values: { is_round_amount: 1.5678, amount_log: 1.4567, type_TRANSFER: 1.3456, is_balance_zeroed_orig: 1.2345 } },
  { id: 29, step: 14, type: 'DEBIT', amount: 12345, nameOrig: 'C40404', oldbalanceOrg: 20000, newbalanceOrig: 7655, nameDest: 'C41414', oldbalanceDest: 5000, newbalanceDest: 17345, isFraud: 0, risk_score: 31, risk_band: 'Medium', is_anomaly: false, anomaly_score: 0.0876, shap_values: { type_DEBIT: 0.1234, amount_log: 0.0876 } },
  { id: 30, step: 14, type: 'CASH_OUT', amount: 234567, nameOrig: 'C42424', oldbalanceOrg: 234567, newbalanceOrig: 0, nameDest: 'M999', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 98, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.6123, shap_values: { is_balance_zeroed_orig: 1.2345, amount_log: 1.1234, type_CASH_OUT: 0.9876 } },
  { id: 31, step: 15, type: 'PAYMENT', amount: 8901, nameOrig: 'C43434', oldbalanceOrg: 15000, newbalanceOrig: 6099, nameDest: 'M000', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 18, risk_band: 'Low', is_anomaly: false, anomaly_score: 0.3456, shap_values: { type_PAYMENT: -0.4567, amount_log: -0.3456 } },
  { id: 32, step: 15, type: 'TRANSFER', amount: 666666, nameOrig: 'C44444', oldbalanceOrg: 666666, newbalanceOrig: 0, nameDest: 'C45454', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 100, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.8456, shap_values: { amount_log: 1.7654, is_round_amount: 1.6543, type_TRANSFER: 1.5432, is_balance_zeroed_orig: 1.4321, is_new_dest: 1.2345 } },
  { id: 33, step: 16, type: 'CASH_IN', amount: 45000, nameOrig: 'C46464', oldbalanceOrg: 0, newbalanceOrig: 45000, nameDest: 'C47474', oldbalanceDest: 100000, newbalanceDest: 145000, isFraud: 0, risk_score: 6, risk_band: 'Low', is_anomaly: false, anomaly_score: 0.4567, shap_values: { type_CASH_IN: -0.7654, is_new_orig: -0.6543 } },
  { id: 34, step: 16, type: 'CASH_OUT', amount: 123456, nameOrig: 'C48484', oldbalanceOrg: 123456, newbalanceOrig: 0, nameDest: 'M111', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 96, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.5432, shap_values: { is_balance_zeroed_orig: 1.0987, amount_log: 0.9876, type_CASH_OUT: 0.8765 } },
  { id: 35, step: 17, type: 'PAYMENT', amount: 3456, nameOrig: 'C49494', oldbalanceOrg: 8000, newbalanceOrig: 4544, nameDest: 'M222', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 11, risk_band: 'Low', is_anomaly: false, anomaly_score: 0.4123, shap_values: { type_PAYMENT: -0.5432, amount_log: -0.4321 } },
  { id: 36, step: 17, type: 'TRANSFER', amount: 888888, nameOrig: 'C50505', oldbalanceOrg: 888888, newbalanceOrig: 0, nameDest: 'C51515', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 100, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.8765, shap_values: { amount_log: 1.8765, is_round_amount: 1.7654, type_TRANSFER: 1.6543, is_balance_zeroed_orig: 1.5432 } },
  { id: 37, step: 18, type: 'DEBIT', amount: 67890, nameOrig: 'C52525', oldbalanceOrg: 100000, newbalanceOrig: 32110, nameDest: 'C53535', oldbalanceDest: 20000, newbalanceDest: 87890, isFraud: 0, risk_score: 42, risk_band: 'Medium', is_anomaly: false, anomaly_score: 0.0567, shap_values: { type_DEBIT: 0.3456, amount_log: 0.2345 } },
  { id: 38, step: 18, type: 'CASH_OUT', amount: 345678, nameOrig: 'C54545', oldbalanceOrg: 345678, newbalanceOrig: 0, nameDest: 'M333', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 97, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.6234, shap_values: { is_balance_zeroed_orig: 1.2345, amount_log: 1.1234, type_CASH_OUT: 0.9876 } },
  { id: 39, step: 19, type: 'PAYMENT', amount: 23456, nameOrig: 'C55555', oldbalanceOrg: 25000, newbalanceOrig: 1544, nameDest: 'M444', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 55, risk_band: 'Medium', is_anomaly: false, anomaly_score: 0.0123, shap_values: { is_balance_zeroed_orig: 0.5432, amount_log: 0.4321, type_PAYMENT: 0.1234 } },
  { id: 40, step: 19, type: 'TRANSFER', amount: 555555, nameOrig: 'C56565', oldbalanceOrg: 555555, newbalanceOrig: 0, nameDest: 'C57575', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 99, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.7123, shap_values: { is_round_amount: 1.5432, amount_log: 1.4321, type_TRANSFER: 1.2345, is_balance_zeroed_orig: 1.1234 } },
  { id: 41, step: 20, type: 'CASH_IN', amount: 60000, nameOrig: 'C58585', oldbalanceOrg: 0, newbalanceOrig: 60000, nameDest: 'C59595', oldbalanceDest: 80000, newbalanceDest: 140000, isFraud: 0, risk_score: 5, risk_band: 'Low', is_anomaly: false, anomaly_score: 0.5123, shap_values: { type_CASH_IN: -0.8765, is_new_orig: -0.7654 } },
  { id: 42, step: 20, type: 'CASH_OUT', amount: 198765, nameOrig: 'C60606', oldbalanceOrg: 200000, newbalanceOrig: 1235, nameDest: 'M555', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 73, risk_band: 'High', is_anomaly: true, anomaly_score: -0.1987, shap_values: { amount_log: 0.8765, is_balance_zeroed_orig: 0.7654, type_CASH_OUT: 0.6543 } },
  { id: 43, step: 21, type: 'PAYMENT', amount: 7890, nameOrig: 'C61616', oldbalanceOrg: 12000, newbalanceOrig: 4110, nameDest: 'M666', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 19, risk_band: 'Low', is_anomaly: false, anomaly_score: 0.3210, shap_values: { type_PAYMENT: -0.4321, amount_log: -0.3210 } },
  { id: 44, step: 21, type: 'TRANSFER', amount: 999999, nameOrig: 'C62626', oldbalanceOrg: 999999, newbalanceOrig: 0, nameDest: 'C63636', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 100, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.9234, shap_values: { amount_log: 1.9876, is_round_amount: 1.8765, type_TRANSFER: 1.7654, is_balance_zeroed_orig: 1.6543, is_new_dest: 1.4321 } },
  { id: 45, step: 22, type: 'DEBIT', amount: 34567, nameOrig: 'C64646', oldbalanceOrg: 50000, newbalanceOrig: 15433, nameDest: 'C65656', oldbalanceDest: 15000, newbalanceDest: 49567, isFraud: 0, risk_score: 38, risk_band: 'Medium', is_anomaly: false, anomaly_score: 0.0987, shap_values: { type_DEBIT: 0.2345, amount_log: 0.1234 } },
  { id: 46, step: 22, type: 'CASH_OUT', amount: 276543, nameOrig: 'C66666', oldbalanceOrg: 276543, newbalanceOrig: 0, nameDest: 'M777', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 98, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.6876, shap_values: { is_balance_zeroed_orig: 1.3456, amount_log: 1.2345, type_CASH_OUT: 1.1234 } },
  { id: 47, step: 23, type: 'PAYMENT', amount: 15678, nameOrig: 'C67676', oldbalanceOrg: 20000, newbalanceOrig: 4322, nameDest: 'M888', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 48, risk_band: 'Medium', is_anomaly: false, anomaly_score: 0.0123, shap_values: { is_balance_zeroed_orig: 0.3456, type_PAYMENT: -0.2345, amount_log: 0.1234 } },
  { id: 48, step: 23, type: 'TRANSFER', amount: 777777, nameOrig: 'C68686', oldbalanceOrg: 777777, newbalanceOrig: 0, nameDest: 'C69696', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 100, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.8567, shap_values: { amount_log: 1.8765, is_round_amount: 1.7654, type_TRANSFER: 1.6543, is_balance_zeroed_orig: 1.5432 } },
  { id: 49, step: 24, type: 'CASH_IN', amount: 85000, nameOrig: 'C70707', oldbalanceOrg: 0, newbalanceOrig: 85000, nameDest: 'C71717', oldbalanceDest: 120000, newbalanceDest: 205000, isFraud: 0, risk_score: 3, risk_band: 'Low', is_anomaly: false, anomaly_score: 0.6789, shap_values: { type_CASH_IN: -0.9876, is_new_orig: -0.8765 } },
  { id: 50, step: 24, type: 'CASH_OUT', amount: 156789, nameOrig: 'C72727', oldbalanceOrg: 160000, newbalanceOrig: 3211, nameDest: 'M999', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 69, risk_band: 'Medium', is_anomaly: true, anomaly_score: -0.1456, shap_values: { amount_log: 0.6543, is_balance_zeroed_orig: 0.5432, type_CASH_OUT: 0.4321 } },
];

// ─── Sub-Components ─────────────────────────────────────────

const StatusBadge = ({ band, isAnomaly }) => {
  const colors = {
    Low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    High: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[band] || colors.Low}`}>
      {isAnomaly && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
      {band}
    </span>
  );
};

const RiskBar = ({ score }) => (
  <div className="flex items-center gap-2">
    <div className="w-20 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${Math.min(score || 0, 100)}%`,
          backgroundColor: score >= 90 ? '#EF4444' : score >= 70 ? '#F59E0B' : score >= 40 ? '#3B82F6' : '#10B981'
        }}
      />
    </div>
    <span className="text-text-primary text-xs font-medium w-6">{score || 0}</span>
  </div>
);

const ShapMiniChart = ({ shapValues }) => {
  if (!shapValues || Object.keys(shapValues).length === 0) {
    return <span className="text-text-muted text-xs">—</span>;
  }
  const entries = Object.entries(shapValues).slice(0, 4);
  const maxVal = Math.max(...entries.map(([, v]) => Math.abs(v)));
  return (
    <div className="space-y-0.5">
      {entries.map(([feature, value]) => (
        <div key={feature} className="flex items-center gap-1.5">
          <span className="text-text-muted text-[10px] w-20 truncate">{feature}</span>
          <div className="flex-1 h-1 bg-background-tertiary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(Math.abs(value) / maxVal) * 100}%`,
                backgroundColor: value > 0 ? '#EF4444' : '#10B981',
                marginLeft: value < 0 ? 'auto' : '0',
                marginRight: value > 0 ? 'auto' : '0',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const DetailDrawer = ({ transaction, onClose }) => {
  if (!transaction) return null;
  const score = transaction.risk_score || 0;
  const color = score >= 90 ? '#EF4444' : score >= 70 ? '#F59E0B' : score >= 40 ? '#3B82F6' : '#10B981';
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background-secondary border-l border-border-subtle h-full overflow-y-auto animate-slideInRight">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-text-primary">Transaction Details</h2>
            <button onClick={onClose} className="p-1 hover:bg-background-tertiary rounded-lg">
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-24 h-24">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="#1E293B" strokeWidth="6" fill="none" />
                <circle cx="48" cy="48" r="40" stroke={color} strokeWidth="6" fill="none"
                  strokeDasharray={`${(score / 100) * 251} 251`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-text-primary">{score}</span>
                <span className="text-xs text-text-muted">/100</span>
              </div>
            </div>
            <span className="mt-2 text-sm font-semibold" style={{ color }}>
              {transaction.risk_band || 'Unknown'}
            </span>
          </div>
          <div className="space-y-3">
            {[
              ['Transaction ID', `#${transaction.id || transaction.transaction_id || '—'}`],
              ['Type', transaction.type || '—'],
              ['Amount', transaction.amount !== undefined ? `$${transaction.amount.toLocaleString()}` : '—'],
              ['From', transaction.nameOrig || '—'],
              ['To', transaction.nameDest || '—'],
              ['Old Balance (Orig)', transaction.oldbalanceOrg !== undefined ? `$${transaction.oldbalanceOrg.toLocaleString()}` : '—'],
              ['New Balance (Orig)', transaction.newbalanceOrig !== undefined ? `$${transaction.newbalanceOrig.toLocaleString()}` : '—'],
              ['Old Balance (Dest)', transaction.oldbalanceDest !== undefined ? `$${transaction.oldbalanceDest.toLocaleString()}` : '—'],
              ['New Balance (Dest)', transaction.newbalanceDest !== undefined ? `$${transaction.newbalanceDest.toLocaleString()}` : '—'],
              ['Anomaly', transaction.is_anomaly ? 'Yes' : 'No'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-2 border-b border-border-subtle/50">
                <span className="text-text-muted text-sm">{label}</span>
                <span className="text-text-primary text-sm font-medium">{value}</span>
              </div>
            ))}
          </div>
          {transaction.shap_values && (
            <div className="mt-6">
              <h3 className="text-text-primary font-semibold mb-3">SHAP Explanation</h3>
              <ShapMiniChart shapValues={transaction.shap_values} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ──────────────────────────────────────────────

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('risk_score');
  const [sortDir, setSortDir] = useState('desc');
  const [filters, setFilters] = useState({ type: '', riskBand: '', status: '', minAmount: '', maxAmount: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [useMock, setUseMock] = useState(false);

  const offset = (page - 1) * pageSize;
  const { transactions: apiTransactions, count: totalCount, loading, error, refetch } = useTransactions(pageSize, offset);

  // Auto-fallback to mock on API error
  useEffect(() => {
    if (error && !useMock) {
      console.warn('API error, using mock data:', error);
      setUseMock(true);
    }
  }, [error, useMock]);

  const rawTransactions = useMock ? MOCK_TRANSACTIONS : (apiTransactions || []);
  const totalItems = useMock ? MOCK_TRANSACTIONS.length : (totalCount || 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // ─── Client-side filtering & sorting ──────────────────────
  const filteredTransactions = useMemo(() => {
    let result = [...rawTransactions];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(tx =>
        (tx.id?.toString() || '').includes(q) ||
        (tx.nameOrig || '').toLowerCase().includes(q) ||
        (tx.nameDest || '').toLowerCase().includes(q) ||
        (tx.amount?.toString() || '').includes(q)
      );
    }

    if (filters.type) result = result.filter(tx => tx.type === filters.type);
    if (filters.riskBand) result = result.filter(tx => tx.risk_band === filters.riskBand);
    if (filters.status === 'anomaly') result = result.filter(tx => tx.is_anomaly);
    else if (filters.status === 'normal') result = result.filter(tx => !tx.is_anomaly);
    if (filters.minAmount) result = result.filter(tx => tx.amount >= parseFloat(filters.minAmount));
    if (filters.maxAmount) result = result.filter(tx => tx.amount <= parseFloat(filters.maxAmount));

    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
      if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

    return result;
  }, [rawTransactions, search, filters, sortField, sortDir]);

  // ─── Sort handler ─────────────────────────────────────────
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(1);
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-text-muted" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-accent-info" /> : <ArrowDown className="w-3 h-3 text-accent-info" />;
  };

  // ─── Pagination helpers ───────────────────────────────────
  const goToPage = (p) => { if (p >= 1 && p <= totalPages) setPage(p); };

  // Stats
  const anomalyCount = filteredTransactions.filter(tx => tx.is_anomaly).length;
  const criticalCount = filteredTransactions.filter(tx => tx.risk_band === 'Critical').length;
  const avgRisk = filteredTransactions.length > 0
    ? (filteredTransactions.reduce((sum, tx) => sum + (tx.risk_score || 0), 0) / filteredTransactions.length).toFixed(1)
    : '0.0';

  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;

  return (
    <div className="space-y-6 animate-fadeIn p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Transactions</h1>
          <p className="text-text-muted text-sm mt-1">Monitor, filter, and inspect all transaction records</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUseMock(!useMock)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${useMock
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-background-tertiary text-text-muted border-border-subtle hover:text-text-primary'
              }`}
          >
            {useMock ? 'Using Mock Data' : 'Using Live API'}
          </button>
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background-tertiary border border-border-subtle text-text-muted text-xs hover:text-text-primary transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: filteredTransactions.length, color: 'text-accent-info', icon: Shield },
          { label: 'Anomalies', value: anomalyCount, color: 'text-red-400', icon: AlertTriangle },
          { label: 'Critical', value: criticalCount, color: 'text-purple-400', icon: TrendingUp },
          { label: 'Avg Risk', value: avgRisk, color: 'text-amber-400', icon: Activity },
        ].map(stat => (
          <div key={stat.label} className="glass-panel rounded-xl p-4 border border-border-subtle flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl bg-background-tertiary flex items-center justify-center ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-text-muted text-xs uppercase tracking-wider">{stat.label}</p>
              <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search by ID, name, or amount..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-background-tertiary border border-border-subtle rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent-info focus:ring-1 focus:ring-accent-info/20"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${showFilters || activeFilterCount > 0
            ? 'bg-accent-info/10 text-accent-info border-accent-info/30'
            : 'bg-background-tertiary text-text-primary border-border-subtle hover:border-border-accent'
            }`}
        >
          <Filter className="w-4 h-4" />
          Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="glass-panel rounded-xl p-4 border border-border-subtle space-y-3 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <select
              value={filters.type}
              onChange={(e) => { setFilters(f => ({ ...f, type: e.target.value })); setPage(1); }}
              className="px-3 py-2 bg-background-tertiary border border-border-subtle rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-info"
            >
              <option value="">All Types</option>
              <option value="TRANSFER">TRANSFER</option>
              <option value="CASH_OUT">CASH_OUT</option>
              <option value="CASH_IN">CASH_IN</option>
              <option value="PAYMENT">PAYMENT</option>
              <option value="DEBIT">DEBIT</option>
            </select>
            <select
              value={filters.riskBand}
              onChange={(e) => { setFilters(f => ({ ...f, riskBand: e.target.value })); setPage(1); }}
              className="px-3 py-2 bg-background-tertiary border border-border-subtle rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-info"
            >
              <option value="">All Risk Bands</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
              className="px-3 py-2 bg-background-tertiary border border-border-subtle rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-info"
            >
              <option value="">All Status</option>
              <option value="anomaly">Anomaly</option>
              <option value="normal">Normal</option>
            </select>
            <input
              type="number"
              placeholder="Min Amount"
              value={filters.minAmount}
              onChange={(e) => { setFilters(f => ({ ...f, minAmount: e.target.value })); setPage(1); }}
              className="px-3 py-2 bg-background-tertiary border border-border-subtle rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent-info"
            />
            <input
              type="number"
              placeholder="Max Amount"
              value={filters.maxAmount}
              onChange={(e) => { setFilters(f => ({ ...f, maxAmount: e.target.value })); setPage(1); }}
              className="px-3 py-2 bg-background-tertiary border border-border-subtle rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent-info"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(filters).map(([key, value]) => value && (
              <span key={key} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent-info/10 text-accent-info text-xs">
                {key}: {value}
                <button onClick={() => { setFilters(f => ({ ...f, [key]: '' })); setPage(1); }}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setFilters({ type: '', riskBand: '', status: '', minAmount: '', maxAmount: '' }); setPage(1); }}
                className="text-text-muted text-xs hover:text-text-primary"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-panel rounded-xl border border-border-subtle overflow-hidden">
        {loading && !useMock ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent-info" />
          </div>
        ) : error && !useMock ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <WifiOff className="w-10 h-10 text-red-400 mb-3" />
            <p className="text-text-primary font-medium">API Connection Failed</p>
            <p className="text-text-muted text-sm mt-1">{error}</p>
            <button
              onClick={() => { setUseMock(true); }}
              className="mt-4 px-4 py-2 bg-accent-info text-white rounded-lg text-sm hover:bg-accent-info/90"
            >
              Use Mock Data
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle bg-background-tertiary/50">
                  {[
                    { key: 'id', label: 'ID', sortable: true },
                    { key: 'type', label: 'Type', sortable: true },
                    { key: 'amount', label: 'Amount', sortable: true },
                    { key: 'risk_score', label: 'Risk', sortable: true },
                    { key: 'risk_band', label: 'Status', sortable: false },
                    { key: 'shap_values', label: 'SHAP', sortable: false },
                    { key: null, label: '', sortable: false },
                  ].map(col => (
                    <th
                      key={col.key || col.label}
                      onClick={() => col.sortable && handleSort(col.key)}
                      className={`text-left text-text-muted text-xs font-medium py-3 px-4 ${col.sortable ? 'cursor-pointer hover:text-text-primary' : ''}`}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.sortable && <SortIcon field={col.key} />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx, i) => (
                  <tr
                    key={tx.id || tx.transaction_id || i}
                    onClick={() => setSelectedTx(tx)}
                    className="border-b border-border-subtle/50 hover:bg-background-tertiary/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 text-text-primary text-sm font-mono">
                      #{tx.id || tx.transaction_id || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${TYPE_CONFIG[tx.type]?.color || 'bg-gray-500/20 text-gray-400'}`}>
                        <span>{TYPE_CONFIG[tx.type]?.icon || '•'}</span>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-text-primary text-sm">
                      ${tx.amount?.toLocaleString() || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <RiskBar score={tx.risk_score} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge band={tx.risk_band || 'Low'} isAnomaly={tx.is_anomaly} />
                    </td>
                    <td className="py-3 px-4">
                      <ShapMiniChart shapValues={tx.shap_values} />
                    </td>
                    <td className="py-3 px-4">
                      <Eye className="w-4 h-4 text-text-muted group-hover:text-accent-info transition-colors" />
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted text-sm">
                      No transactions found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-text-muted text-sm">Page {page} of {totalPages}</span>
          <span className="text-text-muted text-xs">({filteredTransactions.length} items)</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => goToPage(1)} disabled={page === 1} className="p-2 rounded-lg hover:bg-background-tertiary disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronsLeft className="w-4 h-4 text-text-muted" />
          </button>
          <button onClick={() => goToPage(page - 1)} disabled={page === 1} className="p-2 rounded-lg hover:bg-background-tertiary disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft className="w-4 h-4 text-text-muted" />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = Math.max(1, Math.min(page - 2 + i, totalPages));
            if (pageNum < 1 || pageNum > totalPages) return null;
            return (
              <button
                key={pageNum}
                onClick={() => goToPage(pageNum)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === pageNum ? 'bg-accent-info text-white' : 'text-text-muted hover:bg-background-tertiary hover:text-text-primary'
                  }`}
              >
                {pageNum}
              </button>
            );
          })}
          <button onClick={() => goToPage(page + 1)} disabled={page === totalPages} className="p-2 rounded-lg hover:bg-background-tertiary disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight className="w-4 h-4 text-text-muted" />
          </button>
          <button onClick={() => goToPage(totalPages)} disabled={page === totalPages} className="p-2 rounded-lg hover:bg-background-tertiary disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronsRight className="w-4 h-4 text-text-muted" />
          </button>
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedTx && <DetailDrawer transaction={selectedTx} onClose={() => setSelectedTx(null)} />}
    </div>
  );
}
