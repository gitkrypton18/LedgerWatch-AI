import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    Database,
    FileJson,
    FileSpreadsheet,
    FileText,
    Loader2,
    ShieldCheck,
    TrendingUp,
    Upload,
    X
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

/* ─────────────────────────────────────────────
   Upload Page — Day 11 React Frontend
   Dark fintech theme: #0A0E1A bg, Inter/JetBrains Mono
   Features: Drag & Drop, CSV/JSON/Parquet support,
   Progress simulation, Validation, Batch upload
   ───────────────────────────────────────────── */

const ACCEPTED_TYPES = {
    'text/csv': { icon: FileSpreadsheet, label: 'CSV', color: 'text-emerald-400' },
    'application/json': { icon: FileJson, label: 'JSON', color: 'text-amber-400' },
    'application/vnd.apache.parquet': { icon: Database, label: 'Parquet', color: 'text-violet-400' },
    'application/octet-stream': { icon: Database, label: 'Parquet', color: 'text-violet-400' },
};

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_FILES = 10;

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getFileMeta(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'csv') return ACCEPTED_TYPES['text/csv'];
    if (ext === 'json') return ACCEPTED_TYPES['application/json'];
    if (ext === 'parquet') return ACCEPTED_TYPES['application/vnd.apache.parquet'];
    return { icon: FileText, label: ext.toUpperCase(), color: 'text-slate-400' };
}

/* ─── Stat Card ─── */
function StatCard({ icon: Icon, label, value, trend }) {
    return (
        <div className="bg-[#111827]/80 border border-slate-800/60 rounded-xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-[#1a2332] rounded-lg">
                    <Icon className="w-5 h-5 text-cyan-400" />
                </div>
                {trend && (
                    <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> {trend}
                    </span>
                )}
            </div>
            <p className="text-slate-400 text-sm font-medium">{label}</p>
            <p className="text-2xl font-bold text-slate-100 mt-1 font-mono">{value}</p>
        </div>
    );
}

/* ─── Upload Progress Bar ─── */
function ProgressBar({ progress, status }) {
    const getColor = () => {
        if (status === 'error') return 'bg-red-500';
        if (status === 'success') return 'bg-emerald-500';
        if (progress > 80) return 'bg-cyan-400';
        return 'bg-cyan-500';
    };

    return (
        <div className="w-full">
            <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-400 font-mono">{status === 'uploading' ? 'Processing...' : status === 'success' ? 'Complete' : 'Failed'}</span>
                <span className="text-slate-300 font-mono">{progress}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-300 ease-out ${getColor()}`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}

/* ─── File Item ─── */
function FileItem({ file, onRemove }) {
    const meta = getFileMeta(file);
    const Icon = meta.icon;

    return (
        <div className="group flex items-center gap-4 p-4 bg-[#111827]/60 border border-slate-800/50 rounded-xl hover:border-slate-700/60 transition-all duration-200">
            <div className={`p-3 bg-[#1a2332] rounded-lg ${meta.color}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-slate-200 font-medium text-sm truncate">{file.name}</p>
                <p className="text-slate-500 text-xs font-mono mt-0.5">{meta.label} · {formatBytes(file.size)}</p>
            </div>
            {file.status === 'uploading' && (
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            )}
            {file.status === 'success' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            )}
            {file.status === 'error' && (
                <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            {file.status === 'pending' && (
                <button
                    onClick={() => onRemove(file.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}

/* ─── Main Upload Page ─── */
export default function UploadPage() {
    const [files, setFiles] = useState([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [globalError, setGlobalError] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    const validateFile = (file) => {
        const ext = file.name.split('.').pop().toLowerCase();
        const validExts = ['csv', 'json', 'parquet'];
        if (!validExts.includes(ext)) {
            return `Invalid format. Accepted: ${validExts.join(', ')}`;
        }
        if (file.size > MAX_FILE_SIZE) {
            return `File too large. Max: ${formatBytes(MAX_FILE_SIZE)}`;
        }
        return null;
    };

    const processFiles = useCallback((fileList) => {
        setGlobalError(null);
        const newFiles = Array.from(fileList).map((file) => ({
            id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            name: file.name,
            size: file.size,
            status: 'pending',
            progress: 0,
            error: null,
        }));

        if (files.length + newFiles.length > MAX_FILES) {
            setGlobalError(`Maximum ${MAX_FILES} files allowed. You have ${files.length} already.`);
            return;
        }

        const validFiles = [];
        for (const f of newFiles) {
            const err = validateFile(f.file);
            if (err) {
                f.status = 'error';
                f.error = err;
            } else {
                validFiles.push(f);
            }
        }

        setFiles((prev) => [...prev, ...newFiles]);
    }, [files.length]);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        processFiles(e.dataTransfer.files);
    };

    const handleFileSelect = (e) => {
        processFiles(e.target.files);
        e.target.value = null; // Reset input
    };

    const removeFile = (id) => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
        setGlobalError(null);
    };

    const clearAll = () => {
        setFiles([]);
        setGlobalError(null);
    };

    // Simulate upload with progress
    const simulateUpload = async () => {
        const pendingFiles = files.filter((f) => f.status === 'pending');
        if (pendingFiles.length === 0) return;

        setIsUploading(true);

        for (const fileObj of pendingFiles) {
            setFiles((prev) =>
                prev.map((f) => (f.id === fileObj.id ? { ...f, status: 'uploading' } : f))
            );

            // Simulate progress in chunks
            const steps = 10;
            for (let i = 1; i <= steps; i++) {
                await new Promise((r) => setTimeout(r, 150 + Math.random() * 200));
                setFiles((prev) =>
                    prev.map((f) => (f.id === fileObj.id ? { ...f, progress: i * 10 } : f))
                );
            }

            // Simulate occasional error (5% chance for demo)
            const hasError = Math.random() < 0.05;
            setFiles((prev) =>
                prev.map((f) =>
                    f.id === fileObj.id
                        ? {
                            ...f,
                            status: hasError ? 'error' : 'success',
                            error: hasError ? 'Network timeout during ingestion' : null,
                            progress: hasError ? f.progress : 100,
                        }
                        : f
                )
            );

            await new Promise((r) => setTimeout(r, 300));
        }

        setIsUploading(false);
    };

    const pendingCount = files.filter((f) => f.status === 'pending').length;
    const successCount = files.filter((f) => f.status === 'success').length;
    const errorCount = files.filter((f) => f.status === 'error').length;
    const uploadingCount = files.filter((f) => f.status === 'uploading').length;

    const totalProgress = files.length > 0
        ? Math.round(files.reduce((acc, f) => acc + f.progress, 0) / files.length)
        : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Data Ingestion</h1>
                    <p className="text-slate-400 mt-1.5 text-sm">
                        Upload transaction datasets for fraud detection analysis. Supports CSV, JSON, and Parquet formats.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 text-sm font-medium">Secure Upload</span>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Database} label="Total Datasets" value={files.length.toString()} trend="+12%" />
                <StatCard icon={CheckCircle2} label="Processed" value={successCount.toString()} />
                <StatCard icon={Upload} label="Pending" value={pendingCount.toString()} />
                <StatCard icon={AlertCircle} label="Errors" value={errorCount.toString()} />
            </div>

            {/* Main Upload Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Drop Zone */}
                <div className="lg:col-span-2 space-y-6">
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`
              relative group cursor-pointer border-2 border-dashed rounded-2xl p-10
              flex flex-col items-center justify-center text-center
              transition-all duration-300 ease-out min-h-[320px]
              ${isDragOver
                                ? 'border-cyan-400 bg-cyan-400/5 scale-[1.01]'
                                : 'border-slate-700 bg-[#111827]/40 hover:border-slate-500 hover:bg-[#111827]/60'
                            }
            `}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".csv,.json,.parquet"
                            className="hidden"
                            onChange={handleFileSelect}
                        />

                        <div className={`
              p-5 rounded-2xl mb-5 transition-all duration-300
              ${isDragOver ? 'bg-cyan-400/15' : 'bg-[#1a2332] group-hover:bg-[#1e293b]'}
            `}>
                            <Upload className={`
                w-10 h-10 transition-colors duration-300
                ${isDragOver ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400'}
              `} />
                        </div>

                        <h3 className="text-lg font-semibold text-slate-200 mb-2">
                            {isDragOver ? 'Drop files here' : 'Drag & drop your files'}
                        </h3>
                        <p className="text-slate-500 text-sm max-w-sm">
                            or <span className="text-cyan-400 font-medium">click to browse</span> from your computer
                        </p>

                        <div className="flex items-center gap-4 mt-6">
                            {Object.entries(ACCEPTED_TYPES).map(([type, meta]) => {
                                const Icon = meta.icon;
                                return (
                                    <div key={type} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a2332] rounded-lg border border-slate-800">
                                        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                                        <span className="text-xs text-slate-400 font-mono">{meta.label}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <p className="text-slate-600 text-xs mt-4 font-mono">
                            Max {formatBytes(MAX_FILE_SIZE)} per file · Up to {MAX_FILES} files
                        </p>
                    </div>

                    {/* Global Error */}
                    {globalError && (
                        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                            <p className="text-red-300 text-sm">{globalError}</p>
                            <button onClick={() => setGlobalError(null)} className="ml-auto text-red-400 hover:text-red-300">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* File List */}
                    {files.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-slate-300">
                                    Files ({files.length})
                                </h3>
                                <div className="flex items-center gap-2">
                                    {totalProgress > 0 && totalProgress < 100 && (
                                        <span className="text-xs text-slate-500 font-mono">{totalProgress}%</span>
                                    )}
                                    <button
                                        onClick={clearAll}
                                        className="text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-400/10"
                                    >
                                        Clear all
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                                {files.map((file) => (
                                    <div key={file.id}>
                                        <FileItem file={file} onRemove={removeFile} />
                                        {file.status === 'uploading' && (
                                            <div className="px-4 pb-3 -mt-2">
                                                <ProgressBar progress={file.progress} status={file.status} />
                                            </div>
                                        )}
                                        {file.status === 'error' && file.error && (
                                            <div className="px-4 pb-2 -mt-1">
                                                <p className="text-xs text-red-400">{file.error}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Upload Button */}
                            {pendingCount > 0 && (
                                <button
                                    onClick={simulateUpload}
                                    disabled={isUploading}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 text-slate-950 font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Processing {uploadingCount} file{uploadingCount !== 1 ? 's' : ''}...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-5 h-5" />
                                            Ingest {pendingCount} Dataset{pendingCount !== 1 ? 's' : ''}
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Right: Info Panel */}
                <div className="space-y-6">
                    {/* Upload Guide */}
                    <div className="bg-[#111827]/60 border border-slate-800/50 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                            <Database className="w-4 h-4 text-cyan-400" />
                            Format Guide
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-emerald-500/10 rounded-lg mt-0.5">
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-300">CSV</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Comma-separated with headers. Max 500MB.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-amber-500/10 rounded-lg mt-0.5">
                                    <FileJson className="w-4 h-4 text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-300">JSON</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Array of transaction objects. Max 500MB.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-violet-500/10 rounded-lg mt-0.5">
                                    <Database className="w-4 h-4 text-violet-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-300">Parquet</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Columnar format for large datasets. Max 500MB.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Required Columns */}
                    <div className="bg-[#111827]/60 border border-slate-800/50 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-cyan-400" />
                            Required Schema
                        </h3>
                        <div className="space-y-2">
                            {['step', 'type', 'amount', 'nameOrig', 'oldbalanceOrg', 'newbalanceOrig', 'nameDest', 'oldbalanceDest', 'newbalanceDest', 'isFraud'].map((col) => (
                                <div key={col} className="flex items-center justify-between py-1.5 px-3 bg-[#1a2332] rounded-lg">
                                    <code className="text-xs text-cyan-300 font-mono">{col}</code>
                                    <span className="text-[10px] text-slate-500 uppercase font-mono">{col === 'isFraud' ? 'target' : 'feature'}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Uploads */}
                    <div className="bg-[#111827]/60 border border-slate-800/50 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-slate-200 mb-4">Recent Uploads</h3>
                        <div className="space-y-3">
                            {[
                                { name: 'paysim_sample_1M.csv', size: '45.2 MB', time: '2h ago', status: 'success' },
                                { name: 'transactions_q2.json', size: '12.8 MB', time: '5h ago', status: 'success' },
                                { name: 'fraud_labels.parquet', size: '3.1 MB', time: '1d ago', status: 'success' },
                            ].map((item) => (
                                <div key={item.name} className="flex items-center gap-3 py-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-slate-300 truncate">{item.name}</p>
                                        <p className="text-[10px] text-slate-500 font-mono">{item.size} · {item.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
