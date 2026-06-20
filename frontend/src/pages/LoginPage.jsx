import React, { useState } from 'react';
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
      
      // Wipe the database upon successful login to ensure a fresh session
      try {
          await api.delete('/transactions/clear', {
              headers: { Authorization: `Bearer ${response.data.access_token}` }
          });
      } catch (err) {
          console.error("Failed to clear previous session data:", err);
      }
      
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

      {/* Developer Footer */}
      <div className="absolute bottom-6 left-0 w-full flex flex-col items-center justify-center space-y-3 z-10 animate-fade-in">
        <p className="text-slate-400 text-sm font-medium tracking-wide">
          Developed by <span className="text-cyan-400 font-semibold drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]">Kalpit Nagar</span>
        </p>
        <div className="flex items-center gap-4">
          <a
            href="https://linkedin.com/in/kalpitnagar"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-slate-900/50 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-400/50 hover:bg-cyan-500/10 transition-all hover:scale-110 shadow-lg backdrop-blur-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
              <rect width="4" height="12" x="2" y="9" />
              <circle cx="4" cy="4" r="2" />
            </svg>
          </a>
          <a
            href="https://github.com/gitkrypton18"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-slate-900/50 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-purple-400 hover:border-purple-400/50 hover:bg-purple-500/10 transition-all hover:scale-110 shadow-lg backdrop-blur-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
