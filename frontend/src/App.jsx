import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import AnalyticsPage from './pages/AnalyticsPage';
import Dashboard from './pages/Dashboard';
import ExplainabilityPage from './pages/ExplainabilityPage';
import SettingsPage from './pages/SettingsPage';
import TransactionsPage from './pages/TransactionsPage';
import UploadPage from './pages/UploadPage';

// ─────────────────────────────────────────────────────────────
// LedgerWatch AI — App Router
// Day 14: All 6 pages with API integration via hooks
// ─────────────────────────────────────────────────────────────

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Layout />}>
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
