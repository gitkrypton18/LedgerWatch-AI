import { useState } from 'react';
import { 
    Brain, 
    X, 
    Loader2, 
    CheckCircle2, 
    AlertTriangle, 
    RefreshCw, 
    Award,
    Clock,
    Database,
    ShieldAlert
} from 'lucide-react';
import { useModels, useRetrain, useSwapModel } from '../../hooks/useApi';

export default function ModelManagementModal({ isOpen, onClose, onModelSwapped }) {
    const [triggerFetch, setTriggerFetch] = useState(0);
    const { data: models, loading: loadingModels, error: fetchError } = useModels(triggerFetch);
    const { retrain, loading: retraining, error: retrainError } = useRetrain();
    const { swap, loading: swapping } = useSwapModel();
    const [retrainResult, setRetrainResult] = useState(null);
    const [actionMessage, setActionMessage] = useState(null);

    if (!isOpen) return null;

    const handleRetrain = async () => {
        setRetrainResult(null);
        setActionMessage(null);
        try {
            const res = await retrain();
            setRetrainResult(res);
            setTriggerFetch(prev => prev + 1);
            if (onModelSwapped && res.promoted) {
                onModelSwapped();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSwap = async (version) => {
        setRetrainResult(null);
        setActionMessage(null);
        try {
            await swap(version);
            setActionMessage({
                type: 'success',
                text: `Successfully swapped active model to version ${version}.`
            });
            setTriggerFetch(prev => prev + 1);
            if (onModelSwapped) {
                onModelSwapped();
            }
        } catch (err) {
            setActionMessage({
                type: 'error',
                text: err.userMessage || err.message || `Failed to swap model to version ${version}.`
            });
        }
    };

    const formatTime = (timeStr) => {
        if (!timeStr || timeStr === 'Unknown') return 'N/A';
        try {
            return new Date(timeStr).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return timeStr;
        }
    };

    const getAucColor = (auc) => {
        if (auc >= 0.90) return 'text-emerald-400';
        if (auc >= 0.85) return 'text-cyan-400';
        if (auc >= 0.70) return 'text-amber-400';
        return 'text-red-400';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            {/* Modal Body */}
            <div className="relative w-full max-w-3xl bg-[#0b0f19] border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-800/60 bg-[#111827]/40">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-cyan-500/10 rounded-lg">
                            <Brain className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-100">Model Management</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Retrain, evaluate, and swap Isolation Forest versions</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    
                    {/* Action Message / Success Toast */}
                    {actionMessage && (
                        <div className={`p-4 rounded-xl text-sm border flex items-center justify-between ${
                            actionMessage.type === 'success' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                            <span>{actionMessage.text}</span>
                            <button onClick={() => setActionMessage(null)} className="text-xs font-semibold hover:opacity-85">Dismiss</button>
                        </div>
                    )}

                    {/* Retrain Section */}
                    <div className="bg-[#111827]/30 border border-slate-800/50 rounded-xl p-5">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-200">Retrain Pipeline</h3>
                                <p className="text-xs text-slate-500 mt-1">Trains a new challenger model on combined database data and original dataset. Auto-promotes only on performance improvement.</p>
                            </div>
                            <button
                                onClick={handleRetrain}
                                disabled={retraining || swapping}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold font-sans tracking-wide uppercase transition-all flex-shrink-0 ${
                                    retraining
                                        ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                                        : "bg-cyan-500 text-[#0a0e17] hover:bg-cyan-400 cursor-pointer shadow-lg shadow-cyan-500/10 hover:-translate-y-0.5"
                                }`}
                            >
                                {retraining ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Retraining...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4" />
                                        Retrain Model
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Error Message */}
                        {retrainError && (
                            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>{retrainError}</span>
                            </div>
                        )}

                        {/* Retrain Metrics Results */}
                        {retrainResult && (
                            <div className="mt-4 border-t border-slate-800/40 pt-4 space-y-3">
                                <div className={`p-3 rounded-lg flex items-start gap-2.5 border text-xs ${
                                    retrainResult.promoted 
                                        ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400' 
                                        : 'bg-amber-500/15 border-amber-500/35 text-amber-400'
                                }`}>
                                    {retrainResult.promoted ? (
                                        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                                    ) : (
                                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                    )}
                                    <div>
                                        <p className="font-bold text-sm">{retrainResult.promoted ? 'Champion Promoted!' : 'Champion Retained'}</p>
                                        <p className="mt-1 leading-relaxed text-[11px] opacity-90">{retrainResult.message}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-[#111827]/40 border border-slate-800/50 rounded-lg p-3 text-center">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Candidate Version</p>
                                        <p className="text-base font-bold font-mono text-slate-200 mt-1">{retrainResult.version}</p>
                                    </div>
                                    <div className="bg-[#111827]/40 border border-slate-800/50 rounded-lg p-3 text-center">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Candidate AUC</p>
                                        <p className={`text-base font-bold font-mono mt-1 ${getAucColor(retrainResult.metrics.candidate_auc)}`}>
                                            {retrainResult.metrics.candidate_auc.toFixed(4)}
                                        </p>
                                    </div>
                                    <div className="bg-[#111827]/40 border border-slate-800/50 rounded-lg p-3 text-center">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Previous AUC</p>
                                        <p className="text-base font-bold font-mono text-slate-400 mt-1">
                                            {retrainResult.metrics.current_auc > 0.5 
                                                ? retrainResult.metrics.current_auc.toFixed(4) 
                                                : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Saved Models List */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-200">Version History</h3>
                            <button 
                                onClick={() => setTriggerFetch(prev => prev + 1)}
                                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline"
                            >
                                <RefreshCw className="w-3 h-3" /> Refresh List
                            </button>
                        </div>

                        {loadingModels && models.length === 0 ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                            </div>
                        ) : fetchError ? (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center text-red-400 text-xs flex items-center justify-center gap-2">
                                <ShieldAlert className="w-4 h-4" />
                                <span>{fetchError}</span>
                            </div>
                        ) : models.length === 0 ? (
                            <div className="text-center py-8 bg-[#111827]/20 border border-slate-850 rounded-xl">
                                <Award className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                                <p className="text-slate-500 text-xs">No models found in saved_models directory.</p>
                            </div>
                        ) : (
                            <div className="border border-slate-800/60 rounded-xl overflow-hidden bg-[#111827]/25">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-800 bg-[#111827]/40 text-slate-400 font-medium">
                                            <th className="py-2.5 px-4">Version</th>
                                            <th className="py-2.5 px-4">Trained At</th>
                                            <th className="py-2.5 px-4 text-center">Dataset Size</th>
                                            <th className="py-2.5 px-4 text-center">Val AUC</th>
                                            <th className="py-2.5 px-4 text-center">Status</th>
                                            <th className="py-2.5 px-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/40">
                                        {models.map((m) => (
                                            <tr key={m.version} className={`hover:bg-slate-800/10 ${m.is_active ? 'bg-cyan-500/[0.02]' : ''}`}>
                                                <td className="py-3 px-4 font-mono font-bold text-slate-200">
                                                    {m.version}
                                                </td>
                                                <td className="py-3 px-4 text-slate-400 font-mono">
                                                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-650" />{formatTime(m.trained_at)}</span>
                                                </td>
                                                <td className="py-3 px-4 text-center text-slate-300 font-mono">
                                                    {m.n_samples > 0 ? (
                                                        <span className="flex items-center justify-center gap-1"><Database className="w-3.5 h-3.5 text-slate-650" />{m.n_samples.toLocaleString()}</span>
                                                    ) : 'Baseline'}
                                                </td>
                                                <td className={`py-3 px-4 text-center font-mono font-semibold ${getAucColor(m.val_auc)}`}>
                                                    {m.val_auc > 0.5 ? m.val_auc.toFixed(4) : 'N/A'}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {m.is_active ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    {!m.is_active && (
                                                        <button
                                                            onClick={() => handleSwap(m.version)}
                                                            disabled={swapping || retraining}
                                                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-750 text-slate-200 rounded-md font-semibold text-[11px] hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Swap Model
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800/60 bg-[#111827]/40 text-right">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-750 text-slate-200 rounded-xl text-xs font-semibold hover:-translate-y-0.5 transition-all cursor-pointer"
                    >
                        Close Window
                    </button>
                </div>
            </div>
        </div>
    );
}
