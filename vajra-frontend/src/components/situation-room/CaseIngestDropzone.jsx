import React, { useCallback, useRef, useState } from 'react';
import { useStore } from '../../store';
import {
  Upload, FileText, CheckCircle, XCircle, Loader2,
  File, Hash, Shield, AlertTriangle, RotateCcw
} from 'lucide-react';

// ─── Accepted file types ───────────────────────────────────────
const ACCEPTED = ['.pdf', '.txt', '.jpg', '.jpeg', '.png', '.json', '.log'];
const ACCEPTED_MIME = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png', 'application/json', 'text/x-log'];

// ─── Formatters ────────────────────────────────────────────────
function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

function fmtHash(hash) {
  return hash ? `${hash.slice(0, 8)}…${hash.slice(-8)}` : '—';
}

// ─── Status UI maps ────────────────────────────────────────────
const STATUS_CFG = {
  idle:       { label: 'Ready to Ingest',    color: 'var(--text-muted)',  icon: null },
  dragging:   { label: 'Drop to Ingest',     color: 'var(--accent)',      icon: null },
  uploading:  { label: 'Uploading to Catalyst...', color: 'var(--cyan)', icon: <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> },
  processing: { label: 'Zia OCR Processing...', color: 'var(--accent)',   icon: <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> },
  complete:   { label: 'Evidence Registered', color: 'var(--success)',    icon: <CheckCircle size={14} /> },
  error:      { label: 'Ingestion Failed',   color: 'var(--danger)',      icon: <XCircle size={14} /> },
};

// ─── OCR result event card ─────────────────────────────────────
function ExtractedEvent({ evt, index }) {
  return (
    <div style={{
      padding: '0.625rem 0.75rem', borderRadius: 6,
      background: 'var(--bg-base)', border: '1px solid var(--bg-border)',
      position: 'relative', paddingLeft: '1.5rem',
    }}>
      <div style={{
        position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
        width: 6, height: 6, borderRadius: '50%', background: 'var(--success)',
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{evt.title}</span>
        <span style={{ fontSize: '0.625rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
          {new Date(evt.timestamp).toLocaleString()}
        </span>
      </div>
      <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginBottom: 4, lineHeight: 1.4 }}>{evt.description}</p>
      <div style={{ display: 'flex', gap: 6 }}>
        <span style={{ fontSize: '0.5625rem', background: 'var(--cyan-dim)', color: 'var(--cyan)', border: '1px solid var(--cyan-border)', padding: '1px 6px', borderRadius: 12, fontWeight: 600 }}>
          {evt.evidence_source}
        </span>
        <span style={{ fontSize: '0.5625rem', background: 'var(--success-dim)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)', padding: '1px 6px', borderRadius: 12, fontWeight: 600 }}>
          {Math.round((evt.confidence || 0) * 100)}% confidence
        </span>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────
export default function CaseIngestDropzone() {
  const { activeCase, uploadStatus, uploadProgress, uploadResult, uploadEvidence, setUploadStatus } = useStore();
  const [pendingFile, setPendingFile] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // ── Drag events ──────────────────────────────────────────────
  const onDragOver  = useCallback((e) => { e.preventDefault(); if (uploadStatus === 'idle') setUploadStatus('dragging'); }, [uploadStatus, setUploadStatus]);
  const onDragLeave = useCallback((e) => { if (!e.currentTarget.contains(e.relatedTarget)) setUploadStatus('idle'); }, [setUploadStatus]);
  const onDrop      = useCallback((e) => {
    e.preventDefault();
    if (uploadStatus !== 'idle' && uploadStatus !== 'dragging') return;
    const file = e.dataTransfer.files[0];
    if (file) validateAndStage(file);
    else setUploadStatus('idle');
  }, [uploadStatus]);

  const onFileInput = (e) => {
    const file = e.target.files[0];
    if (file) validateAndStage(file);
    e.target.value = '';
  };

  function validateAndStage(file) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      setError(`Unsupported format: ${ext}. Accepted: ${ACCEPTED.join(', ')}`);
      setUploadStatus('idle');
      return;
    }
    setError('');
    setPendingFile(file);
    setUploadStatus('idle');
  }

  const handleIngest = async () => {
    if (!pendingFile) return;
    if (!activeCase) { setError('Select an active case before ingesting evidence.'); return; }
    setError('');
    try {
      await uploadEvidence(pendingFile, activeCase.case_number);
      setPendingFile(null);
    } catch (err) {
      setError(err.message || 'Upload failed');
    }
  };

  const handleReset = () => {
    setPendingFile(null);
    setError('');
    setUploadStatus('idle');
  };

  const statusCfg  = STATUS_CFG[uploadStatus] || STATUS_CFG.idle;
  const isDragging = uploadStatus === 'dragging';
  const isBusy     = uploadStatus === 'uploading' || uploadStatus === 'processing';

  return (
    <div style={{ display: 'flex', height: '100%', gap: 12, overflow: 'hidden' }}>

      {/* ── Left: Drop zone + progress ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>

        {/* Drop zone */}
        <div
          className={`dropzone${isDragging ? ' dragging' : uploadStatus === 'complete' ? ' success' : ''}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          style={{
            flexShrink: 0, padding: '2.5rem 1.5rem',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center',
            cursor: isBusy ? 'not-allowed' : 'pointer',
            transition: 'all 0.25s ease',
          }}
          onClick={() => !isBusy && !pendingFile && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            onChange={onFileInput}
            style={{ display: 'none' }}
            disabled={isBusy}
          />

          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: isDragging ? 'var(--accent-dim)' : uploadStatus === 'complete' ? 'var(--success-dim)' : 'var(--bg-elevated)',
            border: `2px solid ${isDragging ? 'var(--accent)' : uploadStatus === 'complete' ? 'var(--success)' : 'var(--bg-border)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.25s ease',
            boxShadow: isDragging ? 'var(--glow-accent)' : uploadStatus === 'complete' ? 'var(--glow-success)' : 'none',
          }}>
            {uploadStatus === 'complete'
              ? <CheckCircle size={24} color="var(--success)" />
              : isBusy
              ? <Loader2 size={24} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
              : <Upload size={24} color={isDragging ? 'var(--accent)' : 'var(--text-muted)'} />
            }
          </div>

          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: statusCfg.color, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {statusCfg.icon}
              {statusCfg.label}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {isBusy
                ? 'Processing with Zia OCR — please wait'
                : uploadStatus === 'complete'
                ? 'Evidence registered in Catalyst File Store'
                : 'Drag & drop FIR documents, witness statements, CCTV logs, or images'
              }
            </div>
            <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: 6 }}>
              Accepted: PDF · TXT · JPG · PNG · JSON · LOG
            </div>
          </div>
        </div>

        {/* Staged file card */}
        {pendingFile && uploadStatus === 'idle' && (
          <div className="glass-panel-elevated" style={{ padding: '0.875rem', display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <File size={18} color="var(--accent)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pendingFile.name}</div>
              <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: 1 }}>{fmtSize(pendingFile.size)} · {pendingFile.type || 'application/octet-stream'}</div>
            </div>
            <button className="btn-ghost" onClick={handleReset} title="Remove"><XCircle size={16} /></button>
          </div>
        )}

        {/* Active case warning */}
        {!activeCase && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '0.625rem 0.875rem', borderRadius: 8, background: 'var(--warning-dim)', border: '1px solid rgba(245,158,11,0.2)', flexShrink: 0 }}>
            <AlertTriangle size={14} color="var(--warning)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600 }}>Select an active case before ingesting evidence.</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '0.625rem 0.875rem', borderRadius: 8, background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.2)', flexShrink: 0 }}>
            <XCircle size={14} color="var(--danger)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>{error}</span>
          </div>
        )}

        {/* Progress bar */}
        {isBusy && (
          <div className="glass-panel-elevated" style={{ padding: '0.875rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {uploadStatus === 'uploading' ? 'Uploading to Catalyst File Store' : 'Zia OCR Extraction in Progress'}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                {uploadStatus === 'uploading' ? `${uploadProgress}%` : '…'}
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-border)', overflow: 'hidden' }}>
              {uploadStatus === 'uploading'
                ? <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                : <div style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, var(--accent), var(--cyan))', animation: 'indeterminate 1.5s ease infinite', backgroundSize: '200% 100%' }} />
              }
            </div>
            <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {uploadStatus === 'uploading' ? 'Encrypted upload via AES-256 transit layer' : 'Zia OCR — extracting text and parsing timeline events'}
            </div>
          </div>
        )}

        {/* Ingest button */}
        {pendingFile && uploadStatus === 'idle' && (
          <button
            className="btn-primary"
            onClick={handleIngest}
            disabled={!activeCase || isBusy}
            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.875rem', flexShrink: 0 }}
          >
            <Shield size={16} />
            Ingest Evidence & Run Zia OCR
          </button>
        )}

        {/* Reset after complete */}
        {uploadStatus === 'complete' && (
          <button className="btn-secondary" onClick={handleReset} style={{ width: '100%', justifyContent: 'center', flexShrink: 0 }}>
            <RotateCcw size={14} /> Ingest Another Document
          </button>
        )}

        {/* Extracted timeline events */}
        {uploadResult?.extracted_timeline?.length > 0 && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--success)', letterSpacing: '0.08em', marginBottom: 8 }}>
              OCR EXTRACTED EVENTS ({uploadResult.extracted_timeline.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {uploadResult.extracted_timeline.map((evt, i) => (
                <ExtractedEvent key={evt.event_id || i} evt={evt} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Evidence record ── */}
      <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>

        <div className="glass-panel-elevated" style={{ padding: '0.875rem' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 10 }}>
            EVIDENCE RECORD
          </div>

          {uploadResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.625rem', borderRadius: 8, background: 'var(--success-dim)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <CheckCircle size={16} color="var(--success)" />
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>REGISTERED</div>
                  <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}>Catalyst File Store</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Evidence ID</div>
                <div style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{uploadResult.evidence_id}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Hash size={10} /> SHA-256 Hash
                </div>
                <div className="hash-display">{fmtHash(uploadResult.sha256_hash)}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Trust Score</span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--success)' }}>{Math.round((uploadResult.trust_score || 0) * 100)}%</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Events Found</span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--cyan)' }}>{uploadResult.extracted_timeline?.length || 0}</span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No evidence registered yet. Drop a document to begin ingestion.
            </div>
          )}
        </div>

        {/* Ingestion pipeline steps */}
        <div className="glass-panel-elevated" style={{ padding: '0.875rem' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 10 }}>
            INGESTION PIPELINE
          </div>
          {[
            { label: 'File Upload (AES-256)', status: ['uploading', 'processing', 'complete'].includes(uploadStatus) },
            { label: 'SHA-256 Hash Generated', status: ['processing', 'complete'].includes(uploadStatus) },
            { label: 'Zia OCR Extraction', status: ['processing', 'complete'].includes(uploadStatus) },
            { label: 'Timeline Agent Parse', status: uploadStatus === 'complete' },
            { label: 'Audit Ledger Entry', status: uploadStatus === 'complete' },
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              {step.status
                ? <CheckCircle size={12} color="var(--success)" />
                : <div style={{ width: 12, height: 12, borderRadius: '50%', border: '1px solid var(--bg-border)', flexShrink: 0 }} />
              }
              <span style={{ fontSize: '0.6875rem', color: step.status ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: step.status ? 600 : 400 }}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Active case */}
        <div className="glass-panel-elevated" style={{ padding: '0.875rem' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 6 }}>
            TARGET CASE
          </div>
          {activeCase
            ? <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{activeCase.case_number}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: 2 }}>{activeCase.title}</div>
              </div>
            : <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No case selected</div>
          }
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes indeterminate {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
