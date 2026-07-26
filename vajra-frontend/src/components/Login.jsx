import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Shield, Eye, EyeOff, Activity, Cpu, Database, Key, Terminal, CheckCircle, Server, AlertCircle } from 'lucide-react';

function Login() {
  const [email, setEmail] = useState('inspector.rajesh@karnataka.gov.in');
  const [password, setPassword] = useState('VajraPass123');
  const [showPassword, setShowPassword] = useState(false);
  
  // Registration States
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [kgid, setKgid] = useState('');
  const [rankId, setRankId] = useState('1'); // Default: 1 (Inspector)
  const [regSuccess, setRegSuccess] = useState(false);

  const login = useStore((state) => state.login);
  const register = useStore((state) => state.register);
  const loading = useStore((state) => state.loading);
  const error = useStore((state) => state.error);
  const mockMode = useStore((state) => state.mockMode);
  const setMockMode = useStore((state) => state.setMockMode);

  // Responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // System Logs Ticker
  const [logs, setLogs] = useState([
    "[SYSTEM] SSL/TLS secure tunnel established.",
    "[CATALYST] Database instance initialized in ADMIN scope.",
    "[COGNITIVE] Multi-agent orchestrator online and listening.",
    "[LEDGER] Cryptographic audit chain synced (Block #88421).",
    "[ZIA_NMT] Regional Kannada language engine mapped."
  ]);

  useEffect(() => {
    const phrases = [
      "DB TRANSACTION: Verified active officer record context.",
      "COGNITIVE INTEL: Resolving active case correlation graph...",
      "AUDIT LEDGER: Committed entry to SCRB ledger chain.",
      "FORECAST ENGINE: QuickML hotspot prediction matrix refreshed.",
      "TRANSLATION: Zia NMT mapped IPC sections dynamically.",
      "EVIDENCE SERVICE: SmartBrowz export generator online.",
      "GATEWAY MONITOR: API request resolved successfully."
    ];
    const interval = setInterval(() => {
      const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
      const time = new Date().toLocaleTimeString();
      setLogs(prev => [...prev.slice(1), `[${time}] ${randomPhrase}`]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isRegistering) {
      const ok = await register(name, regEmail, regPassword, kgid, rankId);
      if (ok) {
        setRegSuccess(true);
        setEmail(regEmail);
        setPassword(regPassword);
        setTimeout(() => {
          setIsRegistering(false);
          setRegSuccess(false);
          setName('');
          setRegEmail('');
          setRegPassword('');
          setKgid('');
        }, 2200);
      }
    } else {
      await login(email, password);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1.1fr 0.9fr',
      background: 'radial-gradient(circle at top, #141210 0%, #070605 100%)',
      backgroundImage: `linear-gradient(rgba(217, 119, 6, 0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(217, 119, 6, 0.025) 1px, transparent 1px)`,
      backgroundSize: '40px 40px',
      color: '#f5f5f4',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflowX: 'hidden'
    }}>
      {/* ── LEFT COLUMN: BRANDING & DIAGNOSTICS (Desktop Only) ── */}
      {!isMobile && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '4rem 5rem',
          borderRight: '1px solid rgba(217, 119, 6, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle overlay glow */}
          <div style={{
            position: 'absolute',
            top: '-20%',
            left: '-20%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(217, 119, 6, 0.04) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          {/* Top Logo branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 2 }}>
            <div style={{
              background: 'linear-gradient(135deg, #d97706 0%, #78350f 100%)',
              width: '45px',
              height: '45px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(217, 119, 6, 0.25)',
              border: '1px solid rgba(251, 191, 36, 0.2)'
            }}>
              <Shield size={22} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#fafaf9', margin: 0 }}>
                VAJRA.AI
              </h1>
              <p style={{ fontSize: '0.625rem', color: '#d97706', letterSpacing: '0.15em', fontWeight: '700', textTransform: 'uppercase', margin: 0 }}>
                SCRB Karnataka Police Portal
              </p>
            </div>
          </div>

          {/* Middle: System overview & description */}
          <div style={{ margin: '3rem 0', zIndex: 2 }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '800', lineHeight: '1.2', letterSpacing: '-0.03em', color: '#fafaf9', marginBottom: '1.25rem' }}>
              State Investigation <br />
              <span style={{ color: '#d97706', background: 'linear-gradient(to right, #f59e0b, #d97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Operating System</span>
            </h2>
            <p style={{ fontSize: '0.925rem', color: '#a8a29e', lineHeight: '1.6', maxWidth: '480px', marginBottom: '2.5rem' }}>
              VAJRA.AI streamlines regional crime analytics, maps timeline correlations, translates local dialects dynamically, and forecasts tactical crime hotspots for Karnataka law enforcement officers.
            </p>

            {/* Dashboard Indicators Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', maxWidth: '500px' }}>
              <div style={{
                background: 'rgba(28, 25, 23, 0.4)',
                border: '1px solid rgba(217, 119, 6, 0.08)',
                padding: '1rem',
                borderRadius: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <Server size={14} color="#10b981" />
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#fafaf9' }}>Database Engine</span>
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#a8a29e' }}>
                  Catalyst ZCQL / Admin Scope Connected
                </div>
              </div>

              <div style={{
                background: 'rgba(28, 25, 23, 0.4)',
                border: '1px solid rgba(217, 119, 6, 0.08)',
                padding: '1rem',
                borderRadius: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <Cpu size={14} color="#f59e0b" />
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#fafaf9' }}>Zia NLP Model</span>
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#a8a29e' }}>
                  Karnataka Dialect translation active
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Diagnostics / Live Logs Ticker */}
          <div style={{
            background: 'rgba(12, 10, 9, 0.8)',
            border: '1px solid rgba(217, 119, 6, 0.15)',
            borderRadius: '12px',
            padding: '1.25rem',
            fontFamily: 'Courier, monospace',
            zIndex: 2,
            maxWidth: '540px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Terminal size={14} color="#d97706" />
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#d97706', letterSpacing: '0.05em' }}>LIVE SECURITY AUDIT LOGS</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: '700' }}>SYS_OK</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', overflow: 'hidden' }}>
              {logs.map((log, idx) => (
                <div key={idx} style={{
                  fontSize: '0.6875rem',
                  color: idx === logs.length - 1 ? '#fbbf24' : '#78716c',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── RIGHT COLUMN: PORTAL CARD (Login & registration form) ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        position: 'relative'
      }}>
        {/* Subtle background glow for mobile */}
        {isMobile && (
          <div style={{
            position: 'absolute',
            top: '10%',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(217, 119, 6, 0.05) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
        )}

        <div style={{
          maxWidth: '450px',
          width: '100%',
          padding: isMobile ? '2rem 1.75rem' : '3.5rem 3rem',
          borderRadius: '20px',
          background: 'rgba(28, 25, 23, 0.65)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(217, 119, 6, 0.15)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          zIndex: 2
        }}>
          {/* Header Mobile Logo */}
          {isMobile && (
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                background: 'linear-gradient(135deg, #d97706 0%, #78350f 100%)',
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem',
                boxShadow: '0 0 15px rgba(217, 119, 6, 0.25)'
              }}>
                <Shield size={24} color="#ffffff" />
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#fafaf9', margin: 0 }}>
                VAJRA.AI
              </h2>
              <span style={{
                fontSize: '0.625rem',
                background: 'rgba(217, 119, 6, 0.1)',
                border: '1px solid rgba(217, 119, 6, 0.3)',
                padding: '3px 10px',
                borderRadius: '9999px',
                color: '#f59e0b',
                fontWeight: '600',
                marginTop: '0.5rem',
                display: 'inline-block'
              }}>
                SCRB KARNATAKA PORTAL
              </span>
            </div>
          )}

          {!isMobile && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.65rem', fontWeight: '700', color: '#fafaf9', margin: '0 0 0.5rem' }}>
                {isRegistering ? "Register Officer Profile" : "Station Login"}
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#a8a29e', margin: 0 }}>
                {isRegistering ? "Create your credentials to access the operation dataset." : "Secure authorization via SCRB credentials token."}
              </p>
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              fontSize: '0.8125rem',
              color: '#fca5a5',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {regSuccess && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              fontSize: '0.8125rem',
              color: '#a7f3d0',
              marginBottom: '1.5rem',
              textAlign: 'center',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              <CheckCircle size={16} color="#10b981" />
              <div>Registration Successful! Syncing profile...</div>
            </div>
          )}

          {isRegistering ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#e7e5e4' }}>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Inspector Ramesh Gowda"
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px',
                    background: 'rgba(12, 10, 9, 0.6)', border: '1px solid rgba(217, 119, 6, 0.25)',
                    color: '#fafaf9', fontSize: '0.8125rem', outline: 'none'
                  }}
                  required
                />
              </div>

              {/* KGID */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#e7e5e4' }}>Government KGID ID</label>
                <input
                  type="text"
                  value={kgid}
                  onChange={(e) => setKgid(e.target.value)}
                  placeholder="e.g. KGID55623"
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px',
                    background: 'rgba(12, 10, 9, 0.6)', border: '1px solid rgba(217, 119, 6, 0.25)',
                    color: '#fafaf9', fontSize: '0.8125rem', outline: 'none'
                  }}
                  required
                />
              </div>

              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#e7e5e4' }}>Official Email Address</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="e.g. si.khamesh@karnataka.gov.in"
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px',
                    background: 'rgba(12, 10, 9, 0.6)', border: '1px solid rgba(217, 119, 6, 0.25)',
                    color: '#fafaf9', fontSize: '0.8125rem', outline: 'none'
                  }}
                  required
                />
              </div>

              {/* Rank/Role */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#e7e5e4' }}>Designation / Rank</label>
                <select
                  value={rankId}
                  onChange={(e) => setRankId(e.target.value)}
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px',
                    background: 'rgba(12, 10, 9, 0.8)', border: '1px solid rgba(217, 119, 6, 0.25)',
                    color: '#fafaf9', fontSize: '0.8125rem', outline: 'none'
                  }}
                >
                  <option value="1">Inspector (SHO)</option>
                  <option value="2">Sub-Inspector (IO)</option>
                  <option value="3">Assistant Sub-Inspector</option>
                  <option value="4">Head Constable</option>
                  <option value="5">Constable</option>
                </select>
              </div>

              {/* Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#e7e5e4' }}>Pass-Token Credentials</label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Secret Password Key"
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px',
                    background: 'rgba(12, 10, 9, 0.6)', border: '1px solid rgba(217, 119, 6, 0.25)',
                    color: '#fafaf9', fontSize: '0.8125rem', outline: 'none'
                  }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '0.8rem', borderRadius: '8px',
                  background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                  color: '#ffffff', fontWeight: '700', border: 'none', cursor: 'pointer',
                  fontSize: '0.875rem', marginTop: '0.5rem', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
                }}
              >
                {loading ? "Registering Officer..." : "Create Officer Badge Profile"}
              </button>

              <button
                type="button"
                onClick={() => { setIsRegistering(false); useStore.setState({ error: null }); }}
                style={{
                  background: 'none', border: 'none', color: '#a8a29e', fontSize: '0.75rem',
                  cursor: 'pointer', textDecoration: 'underline', marginTop: '0.25rem', textAlign: 'center'
                }}
              >
                Return to Authorized Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Email input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#e7e5e4' }}>Official Username / Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    background: 'rgba(12, 10, 9, 0.6)',
                    border: '1px solid rgba(217, 119, 6, 0.25)',
                    color: '#fafaf9',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5)'
                  }}
                  required
                />
              </div>

              {/* Password Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#e7e5e4' }}>Credential Token / Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.5rem 0.75rem 1rem',
                      borderRadius: '8px',
                      background: 'rgba(12, 10, 9, 0.6)',
                      border: '1px solid rgba(217, 119, 6, 0.25)',
                      color: '#fafaf9',
                      fontSize: '0.875rem',
                      outline: 'none',
                      boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5)'
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#f59e0b',
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Toggle Mock Mode Option for Judges */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(28, 25, 23, 0.4)',
                border: '1px solid rgba(217, 119, 6, 0.1)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                margin: '0.25rem 0'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#e7e5e4' }}>Datathon Mock Mode</span>
                  <span style={{ fontSize: '0.625rem', color: '#a8a29e' }}>Run frontend using cached responses</span>
                </div>
                <input
                  type="checkbox"
                  checked={mockMode}
                  onChange={(e) => setMockMode(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: '#d97706',
                    cursor: 'pointer'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                  color: '#ffffff',
                  fontWeight: '700',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '0.875rem',
                  marginTop: '0.5rem',
                  boxShadow: '0 4px 12px rgba(217, 119, 6, 0.15)'
                }}
              >
                {loading ? "Authenticating Badge..." : "Authorize Station Entry"}
              </button>

              <button
                type="button"
                onClick={() => { setIsRegistering(true); useStore.setState({ error: null }); }}
                style={{
                  background: 'none', border: 'none', color: '#f59e0b', fontSize: '0.75rem',
                  cursor: 'pointer', textDecoration: 'underline', marginTop: '0.25rem', textAlign: 'center', fontWeight: '600'
                }}
              >
                Register New Officer Profile
              </button>
            </form>
          )}

          {/* Demo Credentials Info */}
          <div style={{
            marginTop: '2rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start',
            fontSize: '0.75rem',
            color: '#d6d3d1',
            lineHeight: '1.4',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            paddingTop: '1.25rem'
          }}>
            <div style={{
              color: '#f59e0b',
              fontWeight: '700',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
              paddingRight: '0.75rem',
              marginRight: '0.25rem'
            }}>
              CREDENTIALS
            </div>
            <div>
              <strong style={{ color: '#fafaf9' }}>Demo Officer:</strong> inspector.rajesh@karnataka.gov.in<br/>
              <strong style={{ color: '#fafaf9' }}>Password:</strong> VajraPass123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
