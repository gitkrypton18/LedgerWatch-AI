import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Key, AlertCircle } from 'lucide-react';
import api from '../lib/axios';

export default function LoginPage() {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Test the API key against a protected endpoint
      await api.get('/transactions?limit=1', {
        headers: { 'X-API-Key': key }
      });
      
      // If successful, save to localStorage and reload/redirect
      localStorage.setItem('ledgerwatch_apiKey', key);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.status === 403 ? 'Invalid API Key. Access Denied.' : 'Connection failed. Check your backend server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-background-secondary border border-border-subtle rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-accent-info/10 rounded-2xl flex items-center justify-center border border-accent-info/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <Shield className="w-8 h-8 text-accent-info" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-text-primary mb-2 tracking-tight">LedgerWatch AI</h1>
        <p className="text-center text-text-muted mb-8 text-sm">Enter your Master API Key to access the dashboard</p>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <div className="relative">
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Master API Key"
                className="w-full bg-background-tertiary border border-border-subtle text-text-primary rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-accent-info focus:ring-1 focus:ring-accent-info transition-all font-mono text-sm"
                required
              />
            </div>
          </div>
          
          {error && (
            <div className="flex items-center gap-2 text-accent-danger text-sm bg-accent-danger/10 p-3 rounded-lg border border-accent-danger/20 animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-info hover:bg-blue-600 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
