import React, { useState } from 'react';
import { useStore } from '../store';
import { Shield, Eye, EyeOff, Info } from 'lucide-react';

function Login() {
  const [email, setEmail] = useState('inspector.rajesh@karnataka.gov.in');
  const [password, setPassword] = useState('VajraPass123');
  const [showPassword, setShowPassword] = useState(false);
  
  const login = useStore((state) => state.login);
  const loading = useStore((state) => state.loading);
  const error = useStore((state) => state.error);
  const mockMode = useStore((state) => state.mockMode);
  const setMockMode = useStore((state) => state.setMockMode);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'hsl(var(--background))',
      padding: '1.5rem'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '440px',
        width: '100%',
        padding: '3rem 2.5rem',
        border: '1px solid hsl(var(--border))',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            background: '#B36A70', // Dusty Rose Logo Icon background
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <Shield size={26} color="#FAF7F2" />
          </div>
          <h2 style={{ 
            fontSize: '2rem', 
            fontFamily: 'var(--font-display)', 
            color: '#2D2424', 
            marginBottom: '0.25rem',
            fontWeight: '600'
          }}>
            VAJRA.AI
          </h2>
          <p style={{ 
            fontSize: '0.75rem', 
            color: '#B36A70', 
            textTransform: 'uppercase', 
            letterSpacing: '0.125em',
            fontWeight: '600'
          }}>
            Investigation Operating System
          </p>
          <span style={{
            fontSize: '0.6875rem',
            background: 'rgba(194, 168, 120, 0.15)', // Sandstone tinted
            border: '1px solid rgba(194, 168, 120, 0.3)',
            padding: '2px 10px',
            borderRadius: '4px',
            color: '#C2A878', // Sandstone Text
            fontWeight: '600',
            marginTop: '0.75rem',
            display: 'inline-block'
          }}>
            SCRB KARNATAKA PORTAL
          </span>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            fontSize: '0.8125rem',
            color: '#EF4444',
            marginBottom: '1.5rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Email input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#2D2424' }}>Official Username / Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '6px',
                background: '#FFFFFF',
                border: '1px solid hsl(var(--border))',
                color: '#2D2424',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              required
            />
          </div>

          {/* Password Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#2D2424' }}>Credential Token / Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 2.5rem 0.75rem 1rem',
                  borderRadius: '6px',
                  background: '#FFFFFF',
                  border: '1px solid hsl(var(--border))',
                  color: '#2D2424',
                  fontSize: '0.875rem',
                  outline: 'none'
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
                  color: '#C2A878',
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
            background: 'rgba(194, 168, 120, 0.05)',
            border: '1px solid rgba(194, 168, 120, 0.15)',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            margin: '0.25rem 0'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#2D2424' }}>Datathon Mock Mode</span>
              <span style={{ fontSize: '0.625rem', color: '#B36A70' }}>Run frontend using cached responses</span>
            </div>
            <input
              type="checkbox"
              checked={mockMode}
              onChange={(e) => setMockMode(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                cursor: 'pointer'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '6px',
              background: '#B36A70', // Dusty Rose Button
              color: '#FAF7F2',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.2s',
              fontSize: '0.875rem',
              marginTop: '0.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {loading ? "Authenticating Badge..." : "Authorize Station Entry"}
          </button>
        </form>

        {/* Demo Credentials Info */}
        <div style={{
          marginTop: '1.75rem',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'flex-start',
          fontSize: '0.75rem',
          color: '#2D2424',
          lineHeight: '1.3'
        }}>
          <div style={{
            color: '#B36A70',
            fontWeight: '600',
            borderRight: '2px solid hsl(var(--border))',
            paddingRight: '0.5rem',
            marginRight: '0.25rem'
          }}>
            CREDENTIALS
          </div>
          <div>
            <strong>Demo Officer:</strong> inspector.rajesh@karnataka.gov.in<br/>
            <strong>Password:</strong> VajraPass123
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
