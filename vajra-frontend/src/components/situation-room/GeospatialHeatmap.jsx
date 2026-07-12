import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useStore } from '../../store';
import { Layers, MapPin, TrendingUp, RefreshCw, AlertTriangle } from 'lucide-react';

// ─── Dark tile URL (CartoDB dark matter) ───────────────────────
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR  = '© OpenStreetMap contributors © CARTO';

// ─── Hotspot color by intensity ────────────────────────────────
function hotspotColor(intensity) {
  if (intensity >= 0.8) return '#ef4444';
  if (intensity >= 0.6) return '#f59e0b';
  if (intensity >= 0.4) return '#22d3ee';
  return '#10b981';
}

function hotspotLabel(intensity) {
  if (intensity >= 0.8) return 'CRITICAL';
  if (intensity >= 0.6) return 'HIGH';
  if (intensity >= 0.4) return 'MEDIUM';
  return 'LOW';
}

// ─── Auto-fit component ───────────────────────────────────────
function AutoFit({ hotspots }) {
  const map = useMap();
  useEffect(() => {
    if (hotspots.length > 0) {
      const bounds = hotspots.map(h => [h.lat, h.lng]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [hotspots, map]);
  return null;
}

// ─── Filter chip ───────────────────────────────────────────────
function FilterChip({ label, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '3px 10px', borderRadius: 20, fontSize: '0.625rem', fontWeight: 700,
      cursor: 'pointer', border: '1px solid',
      borderColor: active ? color : 'var(--bg-border)',
      background: active ? `${color}18` : 'var(--bg-elevated)',
      color: active ? color : 'var(--text-secondary)',
      transition: 'all 0.15s ease',
    }}>
      {label}
    </button>
  );
}

// ─── Main component ────────────────────────────────────────────
export default function GeospatialHeatmap() {
  const { hotspots, hotspotsLoading, fetchHotspots } = useStore();
  const [activeTypes, setActiveTypes] = useState(new Set(['ALL']));
  const [showPulse, setShowPulse]     = useState(true);

  useEffect(() => { fetchHotspots(); }, []);

  const allTypes = ['ALL', ...new Set(hotspots.map(h => h.type))];

  const toggleType = (type) => {
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (type === 'ALL') return new Set(['ALL']);
      next.delete('ALL');
      if (next.has(type)) next.delete(type);
      else next.add(type);
      if (next.size === 0) return new Set(['ALL']);
      return next;
    });
  };

  const visibleHotspots = hotspots.filter(h =>
    activeTypes.has('ALL') || activeTypes.has(h.type)
  );

  const criticalCount = hotspots.filter(h => h.intensity >= 0.8).length;
  const totalCount    = hotspots.reduce((acc, h) => acc + (h.count || 0), 0);

  return (
    <div style={{ display: 'flex', height: '100%', gap: 12, overflow: 'hidden' }}>

      {/* ── Map ── */}
      <div className="glass-panel" style={{ flex: 1, position: 'relative', overflow: 'hidden', minWidth: 0 }}>

        {/* Top bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 500,
          background: 'rgba(13,15,20,0.9)', borderBottom: '1px solid var(--bg-border)',
          padding: '0.625rem 0.875rem', display: 'flex', alignItems: 'center', gap: 8,
          backdropFilter: 'blur(8px)',
        }}>
          <MapPin size={12} color="var(--accent)" />
          <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em' }}>
            CRIME HOTSPOT INTELLIGENCE — KARNATAKA
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            {allTypes.map(t => (
              <FilterChip
                key={t}
                label={t}
                active={activeTypes.has(t)}
                color={t === 'ALL' ? 'var(--accent)' : 'var(--cyan)'}
                onClick={() => toggleType(t)}
              />
            ))}
            <button className="btn-ghost" style={{ padding: '2px 6px' }}
              onClick={fetchHotspots} title="Refresh">
              <RefreshCw size={12} style={{ animation: hotspotsLoading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>

        {/* Leaflet map */}
        <MapContainer
          center={[12.9716, 77.5946]}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer url={DARK_TILES} attribution={TILE_ATTR} />
          <AutoFit hotspots={visibleHotspots} />

          {visibleHotspots.map((h, i) => {
            const color  = hotspotColor(h.intensity);
            const radius = 6 + h.intensity * 18;
            return (
              <React.Fragment key={i}>
                {/* Pulse ring */}
                {showPulse && (
                  <CircleMarker
                    center={[h.lat, h.lng]}
                    radius={radius + 8}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.08, weight: 1.5, opacity: 0.3, dashArray: '4 4' }}
                  />
                )}
                {/* Main marker */}
                <CircleMarker
                  center={[h.lat, h.lng]}
                  radius={radius}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 2, opacity: 0.9 }}
                >
                  <Popup>
                    <div style={{ minWidth: 160, fontFamily: 'var(--font-sans)' }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: color, marginBottom: 4 }}>
                        {h.type}
                      </div>
                      <div style={{ fontSize: 11, color: '#ccc', marginBottom: 2 }}>
                        Incidents reported: <strong style={{ color: '#fff' }}>{h.count}</strong>
                      </div>
                      <div style={{ fontSize: 11, color: '#ccc', marginBottom: 6 }}>
                        Threat level: <strong style={{ color }}>{hotspotLabel(h.intensity)}</strong>
                      </div>
                      <div style={{ fontSize: 10, color: '#888', fontFamily: 'monospace' }}>
                        {h.lat.toFixed(4)}°N, {h.lng.toFixed(4)}°E
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              </React.Fragment>
            );
          })}
        </MapContainer>

        {/* Pulse toggle */}
        <button
          onClick={() => setShowPulse(p => !p)}
          style={{
            position: 'absolute', bottom: 12, left: 12, zIndex: 500,
            background: 'rgba(13,15,20,0.85)', border: '1px solid var(--bg-border)',
            borderRadius: 6, padding: '5px 10px', fontSize: '0.5625rem',
            color: showPulse ? 'var(--accent)' : 'var(--text-muted)',
            cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-sans)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
          <Layers size={11} /> {showPulse ? 'Pulse ON' : 'Pulse OFF'}
        </button>
      </div>

      {/* ── Right sidebar: stats ── */}
      <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>

        {/* KPI cards */}
        <div className="glass-panel-elevated" style={{ padding: '0.875rem' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 10 }}>
            DISTRICT OVERVIEW
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Total Incidents</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{totalCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Hotspot Zones</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>{hotspots.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Critical Zones</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>{criticalCount}</span>
            </div>
          </div>
        </div>

        {/* Threat level key */}
        <div className="glass-panel-elevated" style={{ padding: '0.875rem' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 8 }}>
            THREAT LEVELS
          </div>
          {[
            { label: 'CRITICAL', color: '#ef4444', range: '≥ 0.8' },
            { label: 'HIGH',     color: '#f59e0b', range: '0.6–0.8' },
            { label: 'MEDIUM',   color: '#22d3ee', range: '0.4–0.6' },
            { label: 'LOW',      color: '#10b981', range: '< 0.4' },
          ].map(t => (
            <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', flex: 1 }}>{t.label}</span>
              <span style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{t.range}</span>
            </div>
          ))}
        </div>

        {/* Hotspot list */}
        <div className="glass-panel-elevated" style={{ padding: '0.875rem', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 8 }}>
            ACTIVE ZONES ({visibleHotspots.length})
          </div>
          {visibleHotspots
            .sort((a, b) => b.intensity - a.intensity)
            .map((h, i) => {
              const color = hotspotColor(h.intensity);
              return (
                <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--bg-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{h.type}</span>
                    <span style={{ fontSize: '0.625rem', fontWeight: 700, color }}>
                      {Math.round(h.intensity * 100)}%
                    </span>
                  </div>
                  <div style={{ height: 3, background: 'var(--bg-border)', borderRadius: 2, overflow: 'hidden', marginBottom: 2 }}>
                    <div style={{ height: '100%', width: `${h.intensity * 100}%`, background: color, borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)' }}>
                    {h.count} cases · {h.lat.toFixed(4)}, {h.lng.toFixed(4)}
                  </div>
                </div>
              );
            })}
        </div>

        {/* QuickML note */}
        <div className="glass-panel-elevated" style={{ padding: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <TrendingUp size={12} color="var(--success)" />
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--success)' }}>QuickML FORECAST</span>
          </div>
          <p style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Predictions based on pre-calculated spatial-temporal crime index. Live QuickML regression available post-datathon.
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
