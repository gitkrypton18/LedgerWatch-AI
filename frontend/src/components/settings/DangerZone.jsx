import React, { useState } from 'react';
import { AlertTriangle, Trash2, RotateCcw, Download } from 'lucide-react';

export default function DangerZone() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = () => {
    if (confirmText === 'DELETE') {
      alert('All data cleared! (This is a demo — no actual data was deleted.)');
      setShowConfirm(false);
      setConfirmText('');
    }
  };

  return (
    <div className="bg-red-500/5 border border-red-500/20 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-red-500/10 bg-red-500/5">
        <AlertTriangle size={16} className="text-red-400" />
        <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
      </div>
      <div className="px-5 py-4 space-y-4">
        {/* Clear Cache */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-300 font-medium">Clear Local Cache</div>
            <div className="text-xs text-slate-500">Remove all cached transaction data and filters</div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:bg-slate-700 transition-colors">
            <RotateCcw size={14} /> Clear
          </button>
        </div>

        {/* Export Data */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-300 font-medium">Export All Data</div>
            <div className="text-xs text-slate-500">Download all transaction records as JSON</div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:bg-slate-700 transition-colors">
            <Download size={14} /> Export
          </button>
        </div>

        {/* Delete All */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-red-400 font-medium">Delete All Transactions</div>
            <div className="text-xs text-slate-500">Permanently remove all transaction records</div>
          </div>
          <button 
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 transition-colors"
          >
            <Trash2 size={14} /> Delete All
          </button>
        </div>

        {/* Confirmation Dialog */}
        {showConfirm && (
          <div className="mt-3 p-4 bg-red-500/5 border border-red-500/20 rounded-lg space-y-3" style={{animation: 'fadeIn 0.2s ease-out'}}>
            <p className="text-xs text-red-400">This action cannot be undone. Type <span className="font-mono font-bold">DELETE</span> to confirm:</p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full bg-slate-900 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500/50"
            />
            <div className="flex gap-2">
              <button 
                onClick={handleDelete}
                disabled={confirmText !== 'DELETE'}
                className="flex-1 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Confirm Delete
              </button>
              <button 
                onClick={() => { setShowConfirm(false); setConfirmText(''); }}
                className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
