import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    Clock,
    Database,
    FileImage,
    FileJson,
    FileSpreadsheet,
    FileText,
    Loader2,
    ShieldCheck,
    TrendingUp,
    Upload,
    X
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useBatchPredict, useOCR } from '../hooks/useApi';
import { useSettings } from '../context/SettingsContext';
import { playAlertSound } from '../lib/audio';

/* ─────────────────────────────────────────────
   Upload Page — Final Merged Version
   Dark fintech theme: #0A0E1A bg, Inter/JetBrains Mono
   Features: Drag & Drop, CSV/JSON/Parquet/Image/PDF support,
   Real API integration (batch-predict + OCR), Real progress,
   Validation, Batch upload, Retry, Result display
   ───────────────────────────────────────────── */

const ACCEPTED_TYPES = {
    'text/csv': { icon: FileSpreadsheet, label: 'CSV', color: 'text-emerald-400' },
    'application/json': { icon: FileJson, label: 'JSON', color: 'text-amber-400' },
    'application/vnd.apache.parquet': { icon: Database, label: 'Parquet', color: 'text-violet-400' },
    'application/octet-stream': { icon: Database, label: 'Parquet', color: 'text-violet-400' },
    'image/png': { icon: FileImage, label: 'PNG', color: 'text-pink-400' },
    'image/jpeg': { icon: FileImage, label: 'JPG', color: 'text-pink-400' },
    'image/jpg': { icon: FileImage, label: 'JPG', color: 'text-pink-400' },
    'application/pdf': { icon: FileText, label: 'PDF', color: 'text-orange-400' },
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
    const type = file.type;
    if (ACCEPTED_TYPES[type]) return ACCEPTED_TYPES[type];
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'csv') return ACCEPTED_TYPES['text/csv'];
    if (ext === 'json') return ACCEPTED_TYPES['application/json'];
    if (ext === 'parquet') return ACCEPTED_TYPES['application/vnd.apache.parquet'];
    if (ext === 'png') return ACCEPTED_TYPES['image/png'];
    if (ext === 'jpg' || ext === 'jpeg') return ACCEPTED_TYPES['image/jpeg'];
    if (ext === 'pdf') return ACCEPTED_TYPES['application/pdf'];
    return { icon: FileText, label: ext.toUpperCase(), color: 'text-slate-400' };
}

function isImageOrPDF(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    return file.type.startsWith('image/') || file.type === 'application/pdf' || ext === 'pdf';
}

/* ─── Stat Card ─── */
function StatCard({ icon: Icon, label, value, trend }) {
    return (
        <div className="bg-[#111827]/80 border border-slate-800/60 rounded-xl p-4 lg:p-5 backdrop-blur-sm">
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
            <p className="text-xl lg:text-2xl font-bold text-slate-100 mt-1 font-mono">{value}</p>
        </div>
    );
}

/* ─── Progress Bar ─── */
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
                <span className="text-slate-400 font-mono">
                    {status === 'uploading' ? 'Processing...' : status === 'success' ? 'Complete' : 'Failed'}
                </span>
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
function FileItem({ file, onRemove, onRetry }) {
    const meta = getFileMeta(file.file);
    const Icon = meta.icon;
    const isError = file.status === 'error';
    const isComplete = file.status === 'success';
    const isUploading = file.status === 'uploading';

    return (
        <div className={`group flex items-center gap-3 lg:gap-4 p-3 lg:p-4 rounded-xl transition-all duration-200 ${isError
            ? 'bg-red-500/5 border border-red-500/20'
            : isComplete
                ? 'bg-emerald-500/5 border border-emerald-500/20'
                : 'bg-[#111827]/60 border border-slate-800/50 hover:border-slate-700/60'
            }`}>
            <div className={`p-2 lg:p-3 bg-[#1a2332] rounded-lg ${meta.color} flex-shrink-0`}>
                <Icon className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-slate-200 font-medium text-sm truncate">{file.name}</p>
                <p className="text-slate-500 text-xs font-mono mt-0.5">{meta.label} · {formatBytes(file.size)}</p>

                {isUploading && (
                    <div className="mt-2">
                        <ProgressBar progress={file.progress} status={file.status} />
                        <p className="text-slate-500 text-xs mt-1 font-mono">
                            {file.progress < 50 ? 'Uploading...' : file.progress < 90 ? 'Predicting...' : 'Finalizing...'}
                        </p>
                    </div>
                )}

                {file.result && (
                    <div className="mt-2 text-xs">
                        {file.result.total_processed !== undefined && (
                            <span className="text-emerald-400 font-mono">
                                {file.result.anomalies_detected} anomalies in {file.result.total_processed} rows
                            </span>
                        )}
                        {file.result.amount !== undefined && (
                            <span className="text-emerald-400 font-mono">
                                Extracted: ${file.result.amount?.toLocaleString()} from {file.result.vendor || 'unknown vendor'}
                            </span>
                        )}
                    </div>
                )}

                {isError && file.error && (
                    <p className="text-red-400 text-xs mt-1">{file.error}</p>
                )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
                {isComplete && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {isError && (
                    <button
                        onClick={onRetry}
                        className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Retry"
                    >
                        <AlertCircle className="w-4 h-4" />
                    </button>
                )}
                {isUploading && <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />}
                {!isUploading && (
                    <button
                        onClick={onRemove}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

/* ─── Main Upload Page ─── */
export default function UploadPage() {
    const { settings } = useSettings();
    const [files, setFiles] = useState([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [globalError, setGlobalError] = useState(null);
    const [recentUploads, setRecentUploads] = useState([]);
    const fileInputRef = useRef(null);

    const { upload: batchUpload, loading: batchLoading, progress: batchProgress } = useBatchPredict();
    const { upload: ocrUpload, loading: ocrLoading, progress: ocrProgress } = useOCR();

    const isLoading = batchLoading || ocrLoading;

    useEffect(() => {
        const stored = localStorage.getItem('ledgerwatch_recent_uploads');
        if (stored) {
            try {
                setRecentUploads(JSON.parse(stored));
            } catch (e) {
                console.warn('Failed to parse recent uploads:', e);
            }
        }
    }, []);

    const saveRecentUpload = (fileName, size, status, result) => {
        const newUpload = {
            name: fileName,
            size: formatBytes(size),
            time: 'Just now',
            status,
            result: result?.total_processed ? `${result.anomalies_detected} anomalies` : null,
            timestamp: Date.now(),
        };
        setRecentUploads(prev => {
            const updated = [newUpload, ...prev.slice(0, 9)];
            localStorage.setItem('ledgerwatch_recent_uploads', JSON.stringify(updated));
            return updated;
        });
    };

    const validateFile = (file) => {
        const ext = file.name.split('.').pop().toLowerCase();
        const validExts = ['csv', 'json', 'parquet', 'png', 'jpg', 'jpeg', 'pdf'];
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
            result: null,
            error: null,
        }));

        if (files.length + newFiles.length > MAX_FILES) {
            setGlobalError(`Maximum ${MAX_FILES} files allowed. You have ${files.length} already.`);
            return;
        }

        const validatedFiles = newFiles.map((f) => {
            const err = validateFile(f.file);
            if (err) {
                return { ...f, status: 'error', error: err };
            }
            return f;
        });

        setFiles((prev) => [...prev, ...validatedFiles]);
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
        e.target.value = null;
    };

    const removeFile = (id) => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
        setGlobalError(null);
    };

    const clearAll = () => {
        setFiles([]);
        setGlobalError(null);
    };

    const processFile = async (fileObj) => {
        const { file, id } = fileObj;

        setFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, status: 'uploading', progress: 5 } : f))
        );

        try {
            // FIX: Route ALL files (including images/PDFs) to batchUpload (/batch-predict)
            // The backend /batch-predict endpoint automatically detects images, runs OCR, 
            // scores anomalies, and SAVES it to the database!
            const result = await batchUpload(file);

            setFiles((prev) =>
                prev.map((f) =>
                    f.id === id
                        ? { ...f, status: 'success', progress: 100, result }
                        : f
                )
            );

            saveRecentUpload(file.name, file.size, 'success', result);

            // Play alert sound if enabled
            if (settings.soundAlerts) {
                const hasAnomaly = result.anomalies_detected > 0;
                const hasCritical = result.results?.some(r => r.risk_band === 'Critical');
                
                if (settings.criticalOnly) {
                    if (hasCritical) {
                        playAlertSound();
                    }
                } else {
                    if (hasAnomaly) {
                        playAlertSound();
                    }
                }
            }

            return result;
        } catch (err) {
            setFiles((prev) =>
                prev.map((f) =>
                    f.id === id
                        ? { ...f, status: 'error', progress: 0, error: err.userMessage || err.message || 'Upload failed' }
                        : f
                )
            );
            throw err;
        }
    };

    const processAll = async () => {
        const pending = files.filter((f) => f.status === 'pending');
        if (pending.length === 0) return;

        setGlobalError(null);

        for (const fileObj of pending) {
            try {
                await processFile(fileObj);
            } catch (err) {
                // Individual errors handled in processFile
            }
        }
    };

    useEffect(() => {
        if (batchLoading && batchProgress > 0) {
            setFiles(prev => prev.map(f =>
                f.status === 'uploading' && !isImageOrPDF(f.file)
                    ? { ...f, progress: batchProgress }
                    : f
            ));
        }
    }, [batchProgress, batchLoading]);

    useEffect(() => {
        if (ocrLoading && ocrProgress > 0) {
            setFiles(prev => prev.map(f =>
                f.status === 'uploading' && isImageOrPDF(f.file)
                    ? { ...f, progress: ocrProgress }
                    : f
            ));
        }
    }, [ocrProgress, ocrLoading]);

    const pendingCount = files.filter((f) => f.status === 'pending').length;
    const successCount = files.filter((f) => f.status === 'success').length;
    const errorCount = files.filter((f) => f.status === 'error').length;
    const uploadingCount = files.filter((f) => f.status === 'uploading').length;

    const totalProgress = files.length > 0
        ? Math.round(files.reduce((acc, f) => acc + f.progress, 0) / files.length)
        : 0;

    return (
        <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-100 tracking-tight truncate">Data Ingestion</h1>
                    <p className="text-slate-400 mt-1.5 text-sm">
                        Upload transaction datasets or invoice images for fraud detection analysis.
                        Supports CSV, JSON, Parquet, PNG, JPG, and PDF.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex-shrink-0">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 text-sm font-medium">Secure Upload</span>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                <StatCard icon={Database} label="Total Files" value={files.length.toString()} trend="+12%" />
                <StatCard icon={CheckCircle2} label="Processed" value={successCount.toString()} />
                <StatCard icon={Upload} label="Pending" value={pendingCount.toString()} />
                <StatCard icon={AlertCircle} label="Errors" value={errorCount.toString()} />
            </div>

            {/* Main Upload Area */}
            <div className="upload-layout grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                {/* Left: Drop Zone + File List */}
                <div className="lg:col-span-2 space-y-4 lg:space-y-6">
                    {/* Drop Zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`
                            upload-dropzone relative group cursor-pointer border-2 border-dashed rounded-2xl p-6 lg:p-10
                            flex flex-col items-center justify-center text-center
                            transition-all duration-300 ease-out min-h-[240px] lg:min-h-[320px]
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
                            accept=".csv,.json,.parquet,.png,.jpg,.jpeg,.pdf"
                            className="hidden"
                            onChange={handleFileSelect}
                        />

                        <div className={`
                            p-4 lg:p-5 rounded-2xl mb-4 lg:mb-5 transition-all duration-300
                            ${isDragOver ? 'bg-cyan-400/15' : 'bg-[#1a2332] group-hover:bg-[#1e293b]'}
                        `}>
                            <Upload className={`
                                w-8 h-8 lg:w-10 lg:h-10 transition-colors duration-300
                                ${isDragOver ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400'}
                            `} />
                        </div>

                        <h3 className="text-base lg:text-lg font-semibold text-slate-200 mb-2">
                            {isDragOver ? 'Drop files here' : 'Drag & drop your files'}
                        </h3>
                        <p className="text-slate-500 text-sm max-w-sm">
                            or <span className="text-cyan-400 font-medium">click to browse</span> from your computer
                        </p>

                        <div className="flex items-center gap-2 lg:gap-3 mt-4 lg:mt-6 flex-wrap justify-center">
                            {Object.entries(ACCEPTED_TYPES).map(([type, meta]) => {
                                const Icon = meta.icon;
                                return (
                                    <div key={type} className="flex items-center gap-1.5 px-2 lg:px-3 py-1 lg:py-1.5 bg-[#1a2332] rounded-lg border border-slate-800">
                                        <Icon className={`w-3 h-3 lg:w-3.5 lg:h-3.5 ${meta.color}`} />
                                        <span className="text-[10px] lg:text-xs text-slate-400 font-mono">{meta.label}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <p className="text-slate-600 text-xs mt-3 lg:mt-4 font-mono">
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

                            <div className="space-y-2 max-h-[300px] lg:max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                                {files.map((file) => (
                                    <FileItem
                                        key={file.id}
                                        file={file}
                                        onRemove={() => removeFile(file.id)}
                                        onRetry={() => processFile(file)}
                                    />
                                ))}
                            </div>

                            {/* Process Button */}
                            {pendingCount > 0 && (
                                <button
                                    onClick={processAll}
                                    disabled={isLoading || pendingCount === 0}
                                    className="w-full flex items-center justify-center gap-2 py-3 lg:py-3.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 text-slate-950 font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
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
                <div className="space-y-4 lg:space-y-6">
                    {/* Upload Guide */}
                    <div className="bg-[#111827]/60 border border-slate-800/50 rounded-xl p-4 lg:p-6">
                        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                            <Database className="w-4 h-4 text-cyan-400" />
                            Format Guide
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-emerald-500/10 rounded-lg mt-0.5 flex-shrink-0">
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-300">CSV</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Comma-separated with headers. Max 500MB.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-amber-500/10 rounded-lg mt-0.5 flex-shrink-0">
                                    <FileJson className="w-4 h-4 text-amber-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-300">JSON</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Array of transaction objects. Max 500MB.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-violet-500/10 rounded-lg mt-0.5 flex-shrink-0">
                                    <Database className="w-4 h-4 text-violet-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-300">Parquet</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Columnar format for large datasets. Max 500MB.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-pink-500/10 rounded-lg mt-0.5 flex-shrink-0">
                                    <FileImage className="w-4 h-4 text-pink-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-300">Images / PDF</p>
                                    <p className="text-xs text-slate-500 mt-0.5">OCR extraction for amount, date, vendor. Max 500MB.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Required Columns */}
                    <div className="bg-[#111827]/60 border border-slate-800/50 rounded-xl p-4 lg:p-6">
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
                    <div className="bg-[#111827]/60 border border-slate-800/50 rounded-xl p-4 lg:p-6">
                        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-cyan-400" />
                            Recent Uploads
                        </h3>
                        <div className="space-y-3">
                            {recentUploads.length > 0 ? (
                                recentUploads.map((item, index) => (
                                    <div key={index} className="flex items-center gap-3 py-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-slate-300 truncate">{item.name}</p>
                                            <p className="text-[10px] text-slate-500 font-mono">
                                                {item.size} · {item.time}
                                                {item.result && <span className="text-emerald-400 ml-1">· {item.result}</span>}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-500 text-xs text-center py-4">No recent uploads</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
