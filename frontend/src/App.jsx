import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import AnalyticsPage from './pages/AnalyticsPage';
import Dashboard from './pages/Dashboard';
import ExplainabilityPage from './pages/ExplainabilityPage';
import SettingsPage from './pages/SettingsPage';
import TransactionsPage from './pages/TransactionsPage';
import UploadPage from './pages/UploadPage';
import LoginPage from './pages/LoginPage';

// ─────────────────────────────────────────────────────────────
// LedgerWatch AI — App Router
// Protected Routes with API Key Authentication
// ─────────────────────────────────────────────────────────────

const ProtectedRoute = ({ children }) => {
  const hasKey = localStorage.getItem('ledgerwatch_apiKey');
  if (!hasKey) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path='/' element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path='/dashboard' element={<Dashboard />} />
          <Route path='/upload' element={<UploadPage />} />
          <Route path='/transactions' element={<TransactionsPage />} />
          <Route path='/explain' element={<ExplainabilityPage />} />
          <Route path='/analytics' element={<AnalyticsPage />} />
          <Route path='/settings' element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
