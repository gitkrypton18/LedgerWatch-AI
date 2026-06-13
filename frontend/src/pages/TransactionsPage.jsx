import React, { useState, useMemo, useCallback } from 'react';
import { Shield, TrendingUp, AlertTriangle, Activity, RefreshCw } from 'lucide-react';
import FilterBar from '../components/transactions/FilterBar';
import TransactionTable from '../components/transactions/TransactionTable';
import Pagination from '../components/transactions/Pagination';
import DetailDrawer from '../components/transactions/DetailDrawer';

// Rich mock data based on PaySim schema
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
  { id: 39, step: 19, type: 'PAYMENT', amount: 23456, nameOrig: 'C55555', oldbalanceOrg: 25000, newbalanceOrig: 1544, nameDest: 'M444', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 55, risk_band: 'Medium', is_anomaly: true, anomaly_score: -0.0345, shap_values: { is_balance_zeroed_orig: 0.5432, amount_log: 0.4321, type_PAYMENT: 0.1234 } },
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

const PAGE_SIZE = 10;

export default function TransactionsPage() {
  const [filters, setFilters] = useState({
    search: '',
    types: [],
    bands: [],
    status: [],
    minAmount: '',
    maxAmount: '',
  });
  const [sortConfig, setSortConfig] = useState({ key: 'risk_score', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState(null);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
    setCurrentPage(1);
  }, []);

  const filteredTransactions = useMemo(() => {
    let result = [...MOCK_TRANSACTIONS];

    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(tx => 
        tx.id.toString().includes(q) ||
        tx.nameOrig.toLowerCase().includes(q) ||
        tx.nameDest.toLowerCase().includes(q) ||
        tx.amount.toString().includes(q)
      );
    }

    // Type filter
    if (filters.types.length > 0) {
      result = result.filter(tx => filters.types.includes(tx.type));
    }

    // Band filter
    if (filters.bands.length > 0) {
      result = result.filter(tx => filters.bands.includes(tx.risk_band));
    }

    // Status filter
    if (filters.status.length > 0) {
      result = result.filter(tx => 
        (filters.status.includes('Anomaly') && tx.is_anomaly) ||
        (filters.status.includes('Normal') && !tx.is_anomaly)
      );
    }

    // Amount range
    if (filters.minAmount) {
      result = result.filter(tx => tx.amount >= parseFloat(filters.minAmount));
    }
    if (filters.maxAmount) {
      result = result.filter(tx => tx.amount <= parseFloat(filters.maxAmount));
    }

    // Sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [filters, sortConfig]);

  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Stats
  const stats = useMemo(() => ({
    total: filteredTransactions.length,
    anomalies: filteredTransactions.filter(t => t.is_anomaly).length,
    critical: filteredTransactions.filter(t => t.risk_band === 'Critical').length,
    avgRisk: filteredTransactions.length > 0 
      ? (filteredTransactions.reduce((a, b) => a + b.risk_score, 0) / filteredTransactions.length).toFixed(1)
      : 0,
  }), [filteredTransactions]);

  return (
    <div className="p-6 space-y-6" style={{animation: 'fadeInUp 0.5s ease-out'}}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Transactions</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor, filter, and inspect all transaction records</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:bg-slate-700 transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <Shield size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100 font-mono">{stats.total}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Total</div>
          </div>
        </div>
        <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100 font-mono">{stats.anomalies}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Anomalies</div>
          </div>
        </div>
        <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100 font-mono">{stats.critical}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Critical</div>
          </div>
        </div>
        <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Activity size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100 font-mono">{stats.avgRisk}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Avg Risk</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <FilterBar 
        filters={filters} 
        onFilterChange={(f) => { setFilters(f); setCurrentPage(1); }}
        sortConfig={sortConfig}
        onSortChange={setSortConfig}
      />

      {/* Table */}
      <div className="bg-slate-900/30 border border-slate-700/30 rounded-xl overflow-hidden">
        <TransactionTable 
          transactions={paginatedTransactions}
          sortConfig={sortConfig}
          onSort={handleSort}
          onViewDetail={setSelectedTx}
        />
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages || 1}
          totalItems={filteredTransactions.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Detail Drawer */}
      {selectedTx && (
        <DetailDrawer 
          transaction={selectedTx} 
          onClose={() => setSelectedTx(null)} 
        />
      )}
    </div>
  );
}
