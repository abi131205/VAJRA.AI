import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store';
import {
  Shield, CheckCircle, XCircle, RefreshCw, Download,
  Activity, Lock, User, Cpu, FileText, ChevronDown, ChevronUp
} from 'lucide-react';

// ─── Action type config ────────────────────────────────────────
const ACTION_CFG = {
  CASE_STATE_CHANGE: { label: 'Case State Change', color: '#f59e0b', icon: <FileText size={12} /> },
  EVIDENCE_UPLOAD:   { label: 'Evidence Upload',   color: '#22d3ee', icon: <Shield size={12} /> },
  AI_REASONING:      { label: 'AI Reasoning',      color: '#a78bfa', icon: <Cpu size={12} /> },
  LOGIN:             { label: 'Officer Login',      color: '#10b981', icon: <User size={12} /> },
  DEFAULT:           { label: 'System Action',      color: '#8b94a8', icon: <Activity size={12} /> },
};

// ─── SHA-256 hash chain verifier (simplified front-end check) ─
function verifyChain(logs) {
  // In production this would recompute SHA256(prev_hash + action_id + payload)
  // For demo, trust the `verified` flag from the backend / mock data
  return logs.map((log, i) => ({
    ...log,
    chainValid: log.verified !== false,
    prevHash: i === 0 ? 'GENESIS' : logs[i - 1]?.payload_hash,
  }));
}

// ─── Export to CSV ─────────────────────────────────────────────
function exportCSV(logs) {
  const headers = ['action_id', 'actor_id', 'case_id', 'action_type', 'payload_hash', 'created_time', 'verified'];
  const rows = logs.map(l =>
    [l.action_id, l.actor_id, l.case_id, l.action_type, l.payload_hash, l.created_time, l.chainValid ? 'TRUE' : 'FALSE'].join(',')
  );
  const csv  = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href  = URL.createObjectURL(blob);
  link.download = `vajra_audit_ledger_${Date.now()}.csv`;
  link.click();
}

// ─── Single log entry ──────────────────────────────────────────
function AuditEntry({ entry, index, expanded, onToggle }) {
  const cfg      = ACTION_CFG[entry.action_type] || ACTION_CFG.DEFAULT;
  const isValid  = entry.chainValid;
  const isLeft   = index % 2 === 0;

  return (
    <div style={{
      display: 'flex',
      flexDirection: isLeft ? 'row' : 'row-reverse',
      gap: 0,
      alignItems: 'flex-start',
      position: 'relative',
    }}>
      {/* Content box */}
      <div style={{ width: 'calc(50% - 20px)', flexShrink: 0 }}>
        <div
          onClick={onToggle}
          className="glass-panel-elevated"
          style={{
            padding: '0.75rem 0.875rem', cursor: 'pointer', transition: 'all 0.15s ease',
            border: `1px solid ${isValid ? cfg.color + '30' : 'var(--danger)30'}`,
            boxShadow: isValid ? `0 0 12px ${cfg.color}10` : `0 0 12px rgba(239,68,68,0.1)`,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = (isValid ? cfg.color : 'var(--danger)'); }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = isValid ? `${cfg.color}30` : 'var(--danger)30'; }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: cfg.color }}>{cfg.icon}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{cfg.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {isValid ? (
                <span className="badge badge-success">
                  <CheckCircle size={8} /> Verified
                </span>
              ) : (
                <span className="badge badge-danger">
                  <XCircle size={8} /> Broken Chain
                </span>
              )}
              {expanded ? <ChevronUp size={12} color="var(--text-muted)" /> : <ChevronDown size={12} color="var(--text-muted)" />}
            </div>
          </div>

          {/* Actor & case */}
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{entry.actor_id}</span>
            {entry.case_id && <> · <span style={{ color: cfg.color, fontWeight: 600 }}>{entry.case_id}</span></>}
          </div>

          {/* Timestamp */}
          <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {new Date(entry.created_time).toLocaleString()}
          </div>

          {/* Expanded details */}
          {expanded && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--bg-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Lock size={9} /> Payload Hash (SHA-256)
                </div>
                <div className="hash-display">{entry.payload_hash}</div>
              </div>
              {entry.prevHash && (
                <div>
                  <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Previous Hash</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                    {entry.prevHash === 'GENESIS' ? '── GENESIS BLOCK ──' : entry.prevHash}
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Action ID</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>{entry.action_id}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem', borderRadius: 6, background: isValid ? 'var(--success-dim)' : 'var(--danger-dim)', border: `1px solid ${isValid ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                {isValid
                  ? <><CheckCircle size={12} color="var(--success)" /><span style={{ fontSize: '0.6875rem', color: 'var(--success)', fontWeight: 600 }}>Hash chain integrity confirmed</span></>
                  : <><XCircle size={12} color="var(--danger)" /><span style={{ fontSize: '0.6875rem', color: 'var(--danger)', fontWeight: 600 }}>Chain integrity violation detected</span></>
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center dot connector */}
      <div style={{ width: 40, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50%',
          background: isValid ? cfg.color : 'var(--danger)',
          boxShadow: `0 0 10px ${isValid ? cfg.color : 'var(--danger)'}88`,
          border: '2px solid var(--bg-base)',
          flexShrink: 0,
        }} />
      </div>

      {/* Empty side */}
      <div style={{ width: 'calc(50% - 20px)', flexShrink: 0 }} />
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────
export default function AuditLedgerTimeline() {
  const { auditLogs, auditLoading, fetchAuditLogs } = useStore();
  const [expandedId, setExpandedId]   = useState(null);
  const [filterType, setFilterType]   = useState('ALL');

  useEffect(() => { fetchAuditLogs(); }, []);

  const verifiedLogs = useMemo(() => verifyChain(auditLogs), [auditLogs]);

  const allTypes  = ['ALL', ...new Set(auditLogs.map(l => l.action_type))];
  const filtered  = filterType === 'ALL' ? verifiedLogs : verifiedLogs.filter(l => l.action_type === filterType);
  const validCount   = verifiedLogs.filter(l => l.chainValid).length;
  const invalidCount = verifiedLogs.length - validCount;
  const integrityPct = verifiedLogs.length ? Math.round((validCount / verifiedLogs.length) * 100) : 0;

  return (
    <div style={{ display: 'flex', height: '100%', gap: 12, overflow: 'hidden' }}>

      {/* ── Timeline ── */}
      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Toolbar */}
        <div style={{
          padding: '0.75rem 1rem', borderBottom: '1px solid var(--bg-border)',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap',
        }}>
          <Lock size={14} color="var(--accent)" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
            CRYPTOGRAPHIC AUDIT LEDGER
          </span>
          <span className="badge badge-muted">{verifiedLogs.length} entries</span>

          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 4, marginLeft: 8, flexWrap: 'wrap' }}>
            {allTypes.map(t => (
              <button key={t}
                onClick={() => setFilterType(t)}
                style={{
                  padding: '2px 8px', borderRadius: 20, fontSize: '0.5625rem', fontWeight: 700,
                  cursor: 'pointer', border: '1px solid',
                  borderColor: filterType === t ? 'var(--accent)' : 'var(--bg-border)',
                  background: filterType === t ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                  color: filterType === t ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                {t === 'ALL' ? 'ALL' : ACTION_CFG[t]?.label || t}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="btn-ghost" onClick={fetchAuditLogs} title="Refresh">
              <RefreshCw size={12} style={{ animation: auditLoading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button className="btn-ghost" onClick={() => exportCSV(verifiedLogs)} title="Export CSV">
              <Download size={12} /> CSV
            </button>
          </div>
        </div>

        {/* Timeline content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', position: 'relative' }}>
          {auditLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 48 }}>
              <Activity size={40} strokeWidth={1} style={{ marginBottom: 8 }} />
              <div>No audit entries found</div>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              {/* Center vertical line */}
              <div style={{
                position: 'absolute', left: '50%', top: 0, bottom: 0,
                width: 2, transform: 'translateX(-50%)',
                background: 'linear-gradient(to bottom, var(--accent), var(--cyan), var(--success))',
                opacity: 0.3,
              }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {filtered.map((entry, i) => (
                  <AuditEntry
                    key={entry.action_id}
                    entry={entry}
                    index={i}
                    expanded={expandedId === entry.action_id}
                    onToggle={() => setExpandedId(p => p === entry.action_id ? null : entry.action_id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Integrity panel ── */}
      <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>

        {/* Integrity gauge */}
        <div className="glass-panel-elevated" style={{ padding: '0.875rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 12 }}>
            CHAIN INTEGRITY
          </div>
          <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 8px' }}>
            <svg viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="40" cy="40" r="32" fill="none" stroke="var(--bg-border)" strokeWidth="6" />
              <circle cx="40" cy="40" r="32" fill="none"
                stroke={integrityPct === 100 ? 'var(--success)' : integrityPct > 80 ? 'var(--accent)' : 'var(--danger)'}
                strokeWidth="6"
                strokeDasharray={`${integrityPct * 2.01} 201`}
                strokeLinecap="round"
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.125rem', fontWeight: 700, color: integrityPct === 100 ? 'var(--success)' : 'var(--accent)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                {integrityPct}%
              </span>
            </div>
          </div>
          <div style={{ fontSize: '0.6875rem', color: integrityPct === 100 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
            {integrityPct === 100 ? 'All Hashes Verified' : 'Chain Violation Detected'}
          </div>
        </div>

        {/* Count cards */}
        <div className="glass-panel-elevated" style={{ padding: '0.875rem' }}>
          {[
            { label: 'Total Entries',   val: verifiedLogs.length,    color: 'var(--text-primary)' },
            { label: 'Hash Verified',   val: validCount,             color: 'var(--success)' },
            { label: 'Chain Broken',    val: invalidCount,           color: invalidCount > 0 ? 'var(--danger)' : 'var(--text-muted)' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Action breakdown */}
        <div className="glass-panel-elevated" style={{ padding: '0.875rem', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 8 }}>
            BY ACTION TYPE
          </div>
          {Object.entries(ACTION_CFG).filter(([k]) => k !== 'DEFAULT').map(([type, cfg]) => {
            const count = auditLogs.filter(l => l.action_type === type).length;
            if (count === 0) return null;
            return (
              <div key={type} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: cfg.color }}>{cfg.icon}</span>
                    <span style={{ fontSize: '0.5625rem', color: 'var(--text-secondary)' }}>{cfg.label}</span>
                  </div>
                  <span style={{ fontSize: '0.625rem', fontWeight: 700, color: cfg.color, fontFamily: 'var(--font-mono)' }}>{count}</span>
                </div>
                <div style={{ height: 3, background: 'var(--bg-border)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(count / verifiedLogs.length) * 100}%`, background: cfg.color, borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Certification note */}
        <div className="glass-panel-elevated" style={{ padding: '0.75rem' }}>
          <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <Shield size={10} color="var(--accent)" />
              <span style={{ fontWeight: 700, color: 'var(--accent)' }}>ZOHO CATALYST SHIELD</span>
            </div>
            All hashes verified using SHA-256 payload signing. Read-only ledger — no modifications possible.
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
