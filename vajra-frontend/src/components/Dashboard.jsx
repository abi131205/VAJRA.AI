import React, { useEffect, useState, Suspense, lazy } from 'react';
import { useStore } from '../store';
import {
  Shield, Power, Search, PlusCircle, Clock, Network,
  MapPin, Upload, Lock, MessageSquare, Cpu, Download,
  Bell, ChevronRight, ExternalLink, Database, TrendingUp,
  CheckCircle, Circle, AlertCircle, Wifi, WifiOff
} from 'lucide-react';

// ─── Lazy-load heavy components for performance ────────────────
const ChatDashboard       = lazy(() => import('./situation-room/ChatDashboard'));
const NetworkGraphViewer  = lazy(() => import('./situation-room/NetworkGraphViewer'));
const GeospatialHeatmap   = lazy(() => import('./situation-room/GeospatialHeatmap'));
const CaseIngestDropzone  = lazy(() => import('./situation-room/CaseIngestDropzone'));
const AuditLedgerTimeline = lazy(() => import('./situation-room/AuditLedgerTimeline'));

// ─── Tab definitions ───────────────────────────────────────────
const TABS = [
  { id: 'room',    label: 'Situation Room', icon: <Shield size={14} />,       shortcut: '1' },
  { id: 'chat',    label: 'AI Co-Pilot',    icon: <MessageSquare size={14} />, shortcut: '2' },
  { id: 'network', label: 'Network Graph',  icon: <Network size={14} />,       shortcut: '3' },
  { id: 'map',     label: 'Crime Map',      icon: <MapPin size={14} />,        shortcut: '4' },
  { id: 'ingest',  label: 'Case Ingest',    icon: <Upload size={14} />,        shortcut: '5' },
  { id: 'audit',   label: 'Audit Ledger',   icon: <Lock size={14} />,          shortcut: '6' },
];

// ─── Skeleton loader ───────────────────────────────────────────
function TabSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '1rem', height: '100%' }}>
      {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: `${60 + i * 30}px`, borderRadius: 8 }} />)}
    </div>
  );
}

// ─── Notification toast ───────────────────────────────────────
function NotificationFeed({ notifications }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
      {notifications.map(n => (
        <div key={n.id} style={{
          padding: '0.375rem 0.625rem', borderRadius: 6,
          background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)',
          fontSize: '0.625rem', display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>{n.time}</span>
          <span style={{ color: 'var(--text-secondary)', lineHeight: 1.3 }}>{n.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Case status badge ─────────────────────────────────────────
function CaseStatusBadge({ status }) {
  const map = {
    OPEN:               { cls: 'badge-warning',  label: 'Open' },
    UNDER_INVESTIGATION:{ cls: 'badge-cyan',     label: 'Active' },
    CHARGE_SHEETED:     { cls: 'badge-success',  label: 'Charged' },
    CLOSED:             { cls: 'badge-muted',    label: 'Closed' },
  };
  const cfg = map[status] || { cls: 'badge-muted', label: status };
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
}

// ─── Situation Room tab: cases + timeline + legal ──────────────
function SituationRoom() {
  const {
    cases, activeCase, timeline, networkData,
    legalSections, similarCases, fetchCases, setActiveCase, fetchLegalSections, fetchSimilarCases,
    generatePDF, addNotification, notifications,
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab,  setActiveTab]  = useState('timeline');
  const [explainCard, setExplainCard] = useState(null);
  const [newFIR, setNewFIR]         = useState('');
  const [newTitle, setNewTitle]     = useState('');

  useEffect(() => { fetchCases(); }, []);

  useEffect(() => {
    if (activeCase) {
      fetchLegalSections(activeCase.case_number);
      fetchSimilarCases(activeCase.case_number);
    }
  }, [activeCase]);

  const filteredCases = cases.filter(c =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.case_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateCase = (e) => {
    e.preventDefault();
    if (!newFIR || !newTitle) return;
    addNotification(`Case ${newFIR} initialized.`);
    setNewFIR(''); setNewTitle('');
  };

  return (
    <div style={{ display: 'flex', height: '100%', gap: 12, overflow: 'hidden' }}>

      {/* ── Left: Cases directory ── */}
      <div className="glass-panel" style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '0.875rem', borderBottom: '1px solid var(--bg-border)', flexShrink: 0 }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 8 }}>
            CASES DATABASE
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={12} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input className="input-field" placeholder="Filter FIR / MO..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 30, fontSize: '0.75rem' }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {filteredCases.map(c => (
            <div key={c.case_number}
              onClick={() => setActiveCase(c)}
              style={{
                padding: '0.75rem', borderRadius: 6, marginBottom: 6, cursor: 'pointer',
                background: activeCase?.case_number === c.case_number ? 'var(--accent-dim)' : 'transparent',
                border: `1px solid ${activeCase?.case_number === c.case_number ? 'var(--accent-border)' : 'transparent'}`,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { if (activeCase?.case_number !== c.case_number) { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.border = '1px solid var(--bg-border)'; }}}
              onMouseLeave={e => { if (activeCase?.case_number !== c.case_number) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.border = '1px solid transparent'; }}}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{c.case_number}</span>
                <CaseStatusBadge status={c.status} />
              </div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{c.title}</div>
              <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{c.description.slice(0, 70)}…</div>
            </div>
          ))}
        </div>

        {/* Create case form */}
        <form onSubmit={handleCreateCase} style={{ padding: '0.75rem', borderTop: '1px solid var(--bg-border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input className="input-field" placeholder="New FIR number…" value={newFIR} onChange={e => setNewFIR(e.target.value)} style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem' }} />
          <input className="input-field" placeholder="Case title…" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem' }} />
          <button type="submit" className="btn-primary" style={{ justifyContent: 'center', fontSize: '0.75rem', padding: '0.5rem' }}>
            <PlusCircle size={13} /> Initialize Ingress
          </button>
        </form>
      </div>

      {/* ── Center: Case workspace ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden', minWidth: 0 }}>
        {activeCase ? (
          <>
            {/* Case header */}
            <div className="glass-panel" style={{ padding: '0.875rem 1rem', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.625rem', color: 'var(--accent)', fontWeight: 600, marginBottom: 2 }}>ACTIVE CASE</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeCase.case_number} — {activeCase.title}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: 2 }}>{activeCase.description}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <CaseStatusBadge status={activeCase.status} />
                {/* Workspace tab switcher */}
                <div style={{ display: 'flex', gap: 2, background: 'var(--bg-base)', padding: 2, borderRadius: 6, border: '1px solid var(--bg-border)' }}>
                  {[
                    { id: 'timeline', icon: <Clock size={11} />, label: 'Timeline' },
                    { id: 'network',  icon: <Network size={11} />, label: 'Connections' },
                  ].map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '0.25rem 0.625rem', borderRadius: 4, border: 'none',
                        background: activeTab === t.id ? 'var(--accent)' : 'transparent',
                        color: activeTab === t.id ? '#0d0f14' : 'var(--text-secondary)',
                        fontSize: '0.6875rem', fontWeight: 700, cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                      }}>
                      {t.icon}{t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Workspace */}
            <div className="glass-panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {activeTab === 'timeline' ? (
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, fontFamily: 'var(--font-display)' }}>
                    Reconstructed Chronological Timeline
                  </div>
                  {timeline.length > 0 ? (
                    <div style={{ borderLeft: '2px solid var(--bg-border)', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: 16, marginLeft: 6 }}>
                      {timeline.map(evt => (
                        <div key={evt.event_id} style={{ position: 'relative' }}>
                          <div style={{ position: 'absolute', left: '-1.5rem', top: 8, width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg-base)' }} />
                          <div className="glass-panel-elevated" style={{ padding: '0.75rem 0.875rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>{evt.title}</span>
                              <span style={{ fontSize: '0.625rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                                {new Date(evt.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.4 }}>{evt.description}</p>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <span style={{ fontSize: '0.5625rem', background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)', padding: '1px 6px', borderRadius: 12, fontWeight: 600 }}>
                                {evt.evidence_source}
                              </span>
                              <span style={{ fontSize: '0.5625rem', background: 'var(--success-dim)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)', padding: '1px 6px', borderRadius: 12, fontWeight: 600 }}>
                                {Math.round(evt.confidence * 100)}% confidence
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-muted)', paddingTop: 48 }}>
                      <Clock size={36} strokeWidth={1} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 4 }}>No events yet</div>
                        <div style={{ fontSize: '0.75rem' }}>Go to <strong style={{ color: 'var(--accent)' }}>Case Ingest</strong> tab to upload documents and extract timeline</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Suspense fallback={<TabSkeleton />}>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <NetworkGraphViewer />
                  </div>
                </Suspense>
              )}
            </div>
          </>
        ) : (
          <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Cpu size={28} color="var(--text-muted)" strokeWidth={1.5} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', marginBottom: 4 }}>
                No Case Selected
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Choose a case from the directory to open the Investigation Workspace
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Intelligence & Decision Support ── */}
      <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>

        {/* AI System Alerts */}
        <div className="glass-panel" style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <Bell size={12} color="var(--accent)" />
            <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em' }}>LIVE SYSTEM EVENTS</span>
          </div>
          <NotificationFeed notifications={notifications} />
        </div>

        {/* Decision support — only when case is active */}
        {activeCase && (
          <div className="glass-panel" style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto' }}>
            <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em' }}>
              DECISION SUPPORT
            </div>

            {/* Evidence completeness */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Evidence Index</span>
                <span style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{timeline.length > 0 ? '85%' : '0%'}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, width: timeline.length > 0 ? '85%' : '0%', background: 'linear-gradient(90deg, var(--accent), var(--success))', transition: 'width 0.5s ease' }} />
              </div>
            </div>

            {/* BNS legal sections */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>BNS Penalty Mapping</div>
              {legalSections.length > 0 ? legalSections.map(leg => (
                <div key={leg.bns_section} onClick={() => setExplainCard(leg)}
                  style={{
                    padding: '0.5rem 0.75rem', borderRadius: 6, marginBottom: 6, cursor: 'pointer',
                    background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bg-border)'; }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>{leg.bns_section}</div>
                    <div style={{ fontSize: '0.5625rem', color: 'var(--text-secondary)' }}>{leg.title}</div>
                  </div>
                  <ExternalLink size={11} color="var(--text-muted)" />
                </div>
              )) : (
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {timeline.length === 0 ? 'Ingest evidence to trigger legal mapping…' : 'Loading legal analysis…'}
                </div>
              )}
            </div>

            {/* MO Similarity */}
            {similarCases && similarCases.length > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>MO Similarity Match</div>
                {similarCases.map(sim => (
                  <div key={sim.case_number} style={{ padding: '0.625rem 0.75rem', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--accent-border)', marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>{Math.round(sim.similarity_score * 100)}% Match</span>
                      <span style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{sim.case_number}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--bg-border)', borderRadius: 2, marginBottom: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.round(sim.similarity_score * 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
                    </div>
                    <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}>
                      Shared: {sim.overlapping_keys && sim.overlapping_keys.length > 0 ? sim.overlapping_keys.join(', ') : 'None'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SmartBrowz PDF button */}
            <button className="btn-primary"
              onClick={generatePDF}
              disabled={timeline.length === 0}
              style={{ justifyContent: 'center', width: '100%', marginTop: 'auto' }}>
              <Download size={14} /> SmartBrowz Case Brief PDF
            </button>
          </div>
        )}

        {/* Explainability card */}
        {explainCard && (
          <div className="glass-panel glow-panel" style={{ padding: '0.875rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--accent)' }}>
                EXPLAINABILITY — {explainCard.bns_section}
              </span>
              <button className="btn-ghost" style={{ padding: 2 }} onClick={() => setExplainCard(null)}>✕</button>
            </div>
            <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Rationale:</strong> {explainCard.rationale}
              </p>
              <div style={{ padding: '0.5rem', borderRadius: 6, background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--danger)', marginBottom: 3 }}>⚠ ADMISSIBILITY WARNING</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.6875rem', lineHeight: 1.4 }}>{explainCard.admissibility_warning}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.5625rem', color: 'var(--text-muted)', borderTop: '1px solid var(--bg-border)', paddingTop: 6 }}>
                <span>Source: BNS Manual</span>
                <span style={{ color: 'var(--success)' }}>Confidence: {Math.round(explainCard.confidence * 100)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────
export default function Dashboard() {
  const { user, mockMode, logout, notifications } = useStore();
  const [activeTab, setActiveTab] = useState('room');
  const [online, setOnline]       = useState(navigator.onLine);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Keyboard shortcuts for tab switching
  useEffect(() => {
    const handler = (e) => {
      if (e.altKey) {
        const tab = TABS.find(t => t.shortcut === e.key);
        if (tab) { e.preventDefault(); setActiveTab(tab.id); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const unreadCount = notifications.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-base)', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 1rem', height: 52, flexShrink: 0,
        background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.4)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), #d97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--glow-accent)',
          }}>
            <Shield size={14} color="#0d0f14" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
              VAJRA.AI
            </div>
            <div style={{ fontSize: '0.5rem', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1 }}>
              Situation Room
            </div>
          </div>
        </div>

        {mockMode && (
          <span className="badge badge-warning" style={{ marginLeft: 4 }}>DEMO MODE</span>
        )}

        {/* Tab navigation */}
        <nav style={{ display: 'flex', gap: 2, marginLeft: 16, flex: 1 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-nav-item${activeTab === tab.id ? ' active' : ''}`}
              title={`${tab.label} (Alt+${tab.shortcut})`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* Online / offline indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {online
              ? <Wifi size={14} color="var(--success)" />
              : <WifiOff size={14} color="var(--danger)" />
            }
            <span style={{ fontSize: '0.5625rem', color: online ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
              {online ? 'LIVE' : 'FIELD MODE'}
            </span>
          </div>

          {/* Notifications bell */}
          <button className="btn-ghost" style={{ position: 'relative', padding: '4px 6px' }}
            onClick={() => setNotifOpen(o => !o)} title="Notifications">
            <Bell size={16} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 0, right: 0,
                width: 14, height: 14, borderRadius: '50%',
                background: 'var(--accent)', color: '#0d0f14',
                fontSize: '0.5rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--bg-surface)',
              }}>
                {Math.min(unreadCount, 9)}
              </span>
            )}
          </button>

          {/* User info */}
          <div style={{ textAlign: 'right', borderLeft: '1px solid var(--bg-border)', paddingLeft: 10 }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{user?.name || 'Officer'}</div>
            <div style={{ fontSize: '0.5rem', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {user?.role} · {user?.station_id}
            </div>
          </div>

          <button className="btn-ghost" onClick={logout} title="Log out" style={{ padding: 6, color: 'var(--text-muted)' }}>
            <Power size={15} />
          </button>
        </div>
      </header>

      {/* ── Notification dropdown ── */}
      {notifOpen && (
        <div style={{
          position: 'fixed', top: 56, right: 12, zIndex: 1000,
          width: 320, maxHeight: 360, overflowY: 'auto',
          background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)',
          borderRadius: 10, boxShadow: 'var(--shadow-lg)', padding: '0.75rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em' }}>LIVE EVENTS</span>
            <button className="btn-ghost" style={{ padding: 2, fontSize: '0.75rem' }} onClick={() => setNotifOpen(false)}>✕</button>
          </div>
          <NotificationFeed notifications={notifications} />
        </div>
      )}

      {/* ── Main content area ── */}
      <main style={{ flex: 1, padding: '0.75rem', overflow: 'hidden' }}>
        <Suspense fallback={<TabSkeleton />}>
          {activeTab === 'room'    && <SituationRoom />}
          {activeTab === 'chat'    && <ChatDashboard />}
          {activeTab === 'network' && <NetworkGraphViewer />}
          {activeTab === 'map'     && <GeospatialHeatmap />}
          {activeTab === 'ingest'  && <CaseIngestDropzone />}
          {activeTab === 'audit'   && <AuditLedgerTimeline />}
        </Suspense>
      </main>
    </div>
  );
}
