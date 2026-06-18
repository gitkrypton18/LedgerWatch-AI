import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, Key, AlertCircle, Mail, Hexagon, UserPlus } from 'lucide-react';
import api from '../lib/axios';

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (isSignup) {
        // Register the user
        await api.post('/users/register', {
          email: email,
          password: password
        });
        // On success, we immediately proceed to auto-login
      }
      
      setIsLaunching(true);

      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);
      
      const response = await api.post('/token', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      localStorage.setItem('ledgerwatch_token', response.data.access_token);
      
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 800);
    } catch (err) {
      setIsLaunching(false);
      setError(err.response?.data?.detail || (err.response?.status === 401 ? 'Invalid Email or Password.' : 'Connection failed. Check your backend server.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-primary flex items-center justify-center p-4 relative overflow-hidden perspective-1000">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-info/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-purple/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="glass-panel max-w-md w-full rounded-2xl p-8 z-10 relative">
        <div className="flex justify-center mb-6 relative">
          <div className={`w-20 h-20 bg-accent-info/10 rounded-2xl flex items-center justify-center border border-accent-info/30 shadow-[0_0_30px_rgba(0,229,255,0.3)] transition-transform ${isLaunching ? 'animate-rocket' : ''}`}>
            {isLaunching ? (
                <Rocket className="w-10 h-10 text-accent-info" />
            ) : (
                <Hexagon className="w-10 h-10 text-accent-info" />
            )}
          </div>
        </div>
        <h1 className="text-3xl font-bold text-center text-text-primary mb-2 tracking-tight drop-shadow-[0_0_15px_rgba(0,229,255,0.5)]">LedgerWatch AI</h1>
        <p className="text-center text-text-muted mb-8 text-sm">{isSignup ? 'Create your secure account' : 'Secure Authentication Gateway'}</p>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-accent-info transition-colors" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full bg-background-elevated border border-border-subtle text-text-primary rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-accent-info focus:ring-1 focus:ring-accent-info focus:shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all text-sm"
                required
              />
            </div>
          </div>
          <div>
            <div className="relative group">
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-accent-purple transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-background-elevated border border-border-subtle text-text-primary rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple focus:shadow-[0_0_15px_rgba(179,0,255,0.2)] transition-all font-mono text-sm"
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

          {successMsg && (
            <div className="flex items-center gap-2 text-accent-success text-sm bg-accent-success/10 p-3 rounded-lg border border-accent-success/20 animate-fade-in">
              <UserPlus className="w-4 h-4 flex-shrink-0" />
              <p>{successMsg}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-accent-info to-accent-purple hover:from-cyan-400 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:shadow-[0_0_30px_rgba(179,0,255,0.6)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none"
          >
            {loading ? 'Processing...' : isSignup ? 'Create Account' : 'Secure Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
            <button 
                type="button" 
                onClick={() => { setIsSignup(!isSignup); setError(''); setSuccessMsg(''); }} 
                className="text-sm text-text-muted hover:text-accent-info transition-colors"
            >
                {isSignup ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
            </button>
        </div>
      </div>
    </div>
  );
}
