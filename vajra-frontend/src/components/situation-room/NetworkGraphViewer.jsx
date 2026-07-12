import React, { useEffect, useRef, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useStore } from '../../store';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, Info } from 'lucide-react';

// ─── Node color / size config ──────────────────────────────────
const NODE_CFG = {
  SUSPECT:  { color: '#ef4444', ring: '#ef444466', size: 8 },
  OFFICER:  { color: '#22d3ee', ring: '#22d3ee44', size: 7 },
  CASE:     { color: '#f59e0b', ring: '#f59e0b44', size: 8 },
  EVIDENCE: { color: '#10b981', ring: '#10b98144', size: 6 },
  ENTITY:   { color: '#a78bfa', ring: '#a78bfa44', size: 5 },
  DEFAULT:  { color: '#8b94a8', ring: '#8b94a822', size: 5 },
};

const EDGE_COLORS = {
  ACCUSED_IN:  '#ef4444',
  INVESTIGATES:'#22d3ee',
  CONTAINS:    '#10b981',
  SHOWS:       '#10b981',
  OWNS:        '#a78bfa',
  LINKED_TO:   '#f59e0b',
};

// ─── Convert store adjacency list → ForceGraph format ─────────
function toGraphData(networkData) {
  const nodes = (networkData.nodes || []).map(n => ({
    ...n,
    val: NODE_CFG[n.type]?.size ?? 5,
  }));
  const links = (networkData.edges || []).map(e => ({
    source: e.source,
    target: e.target,
    label: e.label,
    confidence: e.confidence ?? 1,
    color: EDGE_COLORS[e.label] || '#4e5669',
  }));
  return { nodes, links };
}

// ─── Node detail sidebar ───────────────────────────────────────
function NodeDetail({ node, onClose }) {
  if (!node) return null;
  const cfg = NODE_CFG[node.type] || NODE_CFG.DEFAULT;
  return (
    <div className="glass-panel-elevated" style={{
      padding: '1rem', width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.625rem', fontWeight: 700, color: cfg.color, letterSpacing: '0.08em' }}>
          ENTITY DETAIL
        </span>
        <button className="btn-ghost" onClick={onClose} style={{ padding: 2 }}>✕</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: cfg.color, boxShadow: `0 0 8px ${cfg.color}` }} />
        <div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>{node.label}</div>
          <div style={{ fontSize: '0.5625rem', fontWeight: 600, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{node.type}</div>
        </div>
      </div>

      {node.properties && Object.entries(node.properties).map(([k, v]) => (
        v && (
          <div key={k} style={{ borderTop: '1px solid var(--bg-border)', paddingTop: 8 }}>
            <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.replace(/_/g, ' ')}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {Array.isArray(v) ? v.join(', ') : String(v)}
            </div>
          </div>
        )
      ))}

      <div style={{ borderTop: '1px solid var(--bg-border)', paddingTop: 8 }}>
        <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Node ID</div>
        <div style={{ fontSize: '0.625rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{node.id}</div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────
export default function NetworkGraphViewer() {
  const networkData = useStore(s => s.networkData);
  const activeCase  = useStore(s => s.activeCase);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoverNode, setHoverNode]       = useState(null);
  const [graphData, setGraphData]       = useState({ nodes: [], links: [] });
  const fgRef = useRef(null);

  useEffect(() => {
    setGraphData(toGraphData(networkData));
    setSelectedNode(null);
  }, [networkData]);

  // Custom node painter
  const paintNode = useCallback((node, ctx, globalScale) => {
    const cfg = NODE_CFG[node.type] || NODE_CFG.DEFAULT;
    const r   = (cfg.size / 2) * (hoverNode?.id === node.id ? 1.4 : 1);
    const isSelected = selectedNode?.id === node.id;

    // Glow ring
    ctx.beginPath();
    ctx.arc(node.x, node.y, r + 4, 0, 2 * Math.PI);
    ctx.fillStyle = isSelected ? `${cfg.color}55` : (hoverNode?.id === node.id ? `${cfg.color}33` : cfg.ring);
    ctx.fill();

    // Main circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = cfg.color;
    ctx.shadowColor = cfg.color;
    ctx.shadowBlur = isSelected ? 12 : (hoverNode?.id === node.id ? 8 : 0);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Label
    const label = node.label || node.id;
    const fontSize = Math.max(10 / globalScale, 2);
    ctx.font = `600 ${fontSize}px Plus Jakarta Sans, sans-serif`;
    ctx.fillStyle = 'var(--text-primary, #e8ecf4)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      label.length > 14 ? label.slice(0, 12) + '…' : label,
      node.x,
      node.y + r + fontSize + 2
    );
  }, [hoverNode, selectedNode]);

  // Custom link painter with label
  const paintLink = useCallback((link, ctx, globalScale) => {
    const start = link.source;
    const end   = link.target;
    if (!start || !end || typeof start.x !== 'number') return;

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = link.color || '#4e5669';
    ctx.lineWidth   = Math.max(1, link.confidence * 2);
    ctx.globalAlpha = 0.6 + link.confidence * 0.4;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Edge label
    if (globalScale > 0.6 && link.label) {
      const mx = (start.x + end.x) / 2;
      const my = (start.y + end.y) / 2;
      const fontSize = Math.max(8 / globalScale, 2);
      ctx.font = `600 ${fontSize}px Plus Jakarta Sans, sans-serif`;
      ctx.fillStyle = link.color || '#8b94a8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(link.label, mx, my);
    }
  }, []);

  const isEmpty = graphData.nodes.length === 0;

  return (
    <div style={{ display: 'flex', height: '100%', gap: 12, overflow: 'hidden' }}>

      {/* ── Graph Canvas ── */}
      <div className="glass-panel" style={{ flex: 1, position: 'relative', overflow: 'hidden', minWidth: 0 }}>
        {/* Scan line effect */}
        <div className="scan-line" />

        {/* Toolbar */}
        <div style={{
          position: 'absolute', top: 12, left: 12, zIndex: 10,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <button className="btn-secondary" style={{ padding: 6 }} title="Zoom in"
            onClick={() => fgRef.current?.zoom(1.5, 400)}>
            <ZoomIn size={14} />
          </button>
          <button className="btn-secondary" style={{ padding: 6 }} title="Zoom out"
            onClick={() => fgRef.current?.zoom(0.7, 400)}>
            <ZoomOut size={14} />
          </button>
          <button className="btn-secondary" style={{ padding: 6 }} title="Fit graph"
            onClick={() => fgRef.current?.zoomToFit(400, 40)}>
            <Maximize2 size={14} />
          </button>
          <button className="btn-secondary" style={{ padding: 6 }} title="Re-layout"
            onClick={() => fgRef.current?.d3ReheatSimulation()}>
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 12, left: 12, zIndex: 10,
          background: 'rgba(13,15,20,0.85)', border: '1px solid var(--bg-border)',
          borderRadius: 8, padding: '0.5rem 0.75rem', display: 'flex', gap: 10, flexWrap: 'wrap',
        }}>
          {Object.entries(NODE_CFG).filter(([k]) => k !== 'DEFAULT').map(([type, cfg]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color }} />
              <span style={{ fontSize: '0.5625rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{type}</span>
            </div>
          ))}
        </div>

        {/* Header badge */}
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
          {activeCase && (
            <span className="badge badge-cyan">{activeCase.case_number}</span>
          )}
        </div>

        {isEmpty ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--text-muted)' }}>
            <Info size={40} strokeWidth={1} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>No Network Data</div>
              <div style={{ fontSize: '0.75rem' }}>Select a case from the Situation Room to load entity graph</div>
            </div>
          </div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            nodeCanvasObject={paintNode}
            nodeCanvasObjectMode={() => 'replace'}
            linkCanvasObject={paintLink}
            linkCanvasObjectMode={() => 'replace'}
            backgroundColor="#0d0f14"
            onNodeClick={(node) => setSelectedNode(prev => prev?.id === node.id ? null : node)}
            onNodeHover={setHoverNode}
            nodeRelSize={4}
            linkDirectionalArrowLength={5}
            linkDirectionalArrowRelPos={1}
            linkDirectionalArrowColor={link => link.color || '#4e5669'}
            cooldownTicks={120}
            onEngineStop={() => fgRef.current?.zoomToFit(400, 40)}
            enableNodeDrag={true}
            enableZoomInteraction={true}
            width={undefined}
            height={undefined}
          />
        )}
      </div>

      {/* ── Node detail ── */}
      {selectedNode ? (
        <NodeDetail node={selectedNode} onClose={() => setSelectedNode(null)} />
      ) : (
        <div className="glass-panel-elevated" style={{
          width: 220, flexShrink: 0, padding: '1rem',
          display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto',
        }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 4 }}>
            NETWORK STATS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="glass-panel" style={{ padding: '0.75rem', textAlign: 'center', border: '1px solid var(--accent-border)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                {graphData.nodes.length}
              </div>
              <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Entities</div>
            </div>
            <div className="glass-panel" style={{ padding: '0.75rem', textAlign: 'center', border: '1px solid var(--cyan-border)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
                {graphData.links.length}
              </div>
              <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Connections</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--bg-border)', paddingTop: 8, marginTop: 4 }}>
            <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Entity Breakdown
            </div>
            {Object.entries(NODE_CFG).filter(([k]) => k !== 'DEFAULT').map(([type, cfg]) => {
              const count = graphData.nodes.filter(n => n.type === type).length;
              if (count === 0) return null;
              return (
                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>{type}</span>
                  </div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: cfg.color, fontFamily: 'var(--font-mono)' }}>{count}</span>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--bg-border)' }}>
            Click a node to inspect · Drag to reposition · Scroll to zoom
          </div>
        </div>
      )}
    </div>
  );
}
