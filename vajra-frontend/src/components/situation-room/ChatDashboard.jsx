import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '../../store';
import {
  Send, Cpu, Loader2, SquareX, BookOpen, GitBranch,
  ChevronRight, CheckCircle, Circle, AlertTriangle, Network, FileText
} from 'lucide-react';

// ─── Agent pipeline config ─────────────────────────────────────
const AGENTS = [
  { id: 'Orchestrator', label: 'Orchestrator', color: '#f59e0b' },
  { id: 'SQL Agent',    label: 'SQL/Search',   color: '#22d3ee' },
  { id: 'Legal Agent',  label: 'Legal Ref.',   color: '#10b981' },
  { id: 'Timeline Agent', label: 'Timeline',   color: '#a78bfa' },
];

// ─── Markdown-lite renderer (bold + newlines) ──────────────────
function renderMarkdown(text) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <React.Fragment key={i}>
        {parts.map((p, j) =>
          p.startsWith('**') && p.endsWith('**')
            ? <strong key={j} style={{ color: 'var(--accent)', fontWeight: 700 }}>{p.slice(2, -2)}</strong>
            : <span key={j}>{p}</span>
        )}
        {i < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

// ─── Source chip ───────────────────────────────────────────────
function SourceChip({ source }) {
  const iconMap = { EVIDENCE: <FileText size={10} />, LEGAL: <BookOpen size={10} />, CASE: <GitBranch size={10} /> };
  const colorMap = { EVIDENCE: 'var(--cyan)', LEGAL: 'var(--success)', CASE: 'var(--accent)' };
  const color = colorMap[source.type] || 'var(--text-secondary)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: '0.625rem', padding: '2px 7px', borderRadius: 20,
      background: `${color}14`, border: `1px solid ${color}30`,
      color, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {iconMap[source.type] || <Circle size={10} />}
      {source.label}
    </span>
  );
}

// ─── Single message bubble ─────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      gap: 6, marginBottom: 16,
    }}>
      {/* Agent trace strip */}
      {!isUser && msg.agentTrace?.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {msg.agentTrace.map((agent, i) => {
            const cfg = AGENTS.find(a => a.id === agent);
            return (
              <React.Fragment key={agent}>
                <span style={{
                  fontSize: '0.5625rem', fontWeight: 700, color: cfg?.color || 'var(--text-secondary)',
                  background: `${cfg?.color || '#888'}16`, border: `1px solid ${cfg?.color || '#888'}28`,
                  padding: '1px 6px', borderRadius: 12, textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {cfg?.label || agent}
                </span>
                {i < msg.agentTrace.length - 1 && <ChevronRight size={10} color="var(--text-muted)" />}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Bubble */}
      <div style={{
        maxWidth: '88%',
        padding: '0.75rem 1rem',
        borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
        background: isUser ? 'var(--accent)' : 'var(--bg-elevated)',
        border: isUser ? 'none' : '1px solid var(--bg-border)',
        color: isUser ? '#0d0f14' : 'var(--text-primary)',
        fontSize: '0.8125rem',
        lineHeight: 1.65,
        fontWeight: isUser ? 600 : 400,
        boxShadow: 'var(--shadow-sm)',
        position: 'relative',
      }}>
        {isUser ? (
          <span>{msg.content}</span>
        ) : (
          <span className={msg.streaming && msg.content ? 'streaming-cursor' : ''}>
            {renderMarkdown(msg.content)}
            {msg.streaming && !msg.content && (
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Analyzing...</span>
            )}
          </span>
        )}
      </div>

      {/* Sources */}
      {!isUser && !msg.streaming && msg.sources?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 2 }}>
          {msg.sources.map((s, i) => <SourceChip key={i} source={s} />)}
        </div>
      )}

      {/* Timestamp */}
      <span style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', paddingInline: 2 }}>
        {new Date(msg.timestamp).toLocaleTimeString()}
      </span>
    </div>
  );
}

// ─── Context panel: shows sources + graph preview ─────────────
function ContextPanel({ lastMsg }) {
  const networkData = useStore(s => s.networkData);
  const activeCase  = useStore(s => s.activeCase);

  const sources  = lastMsg?.sources || [];
  const hasNodes = networkData.nodes?.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflowY: 'auto', padding: '0 4px' }}>
      {/* Active case context */}
      <div className="glass-panel-elevated" style={{ padding: '0.875rem' }}>
        <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 8 }}>
          ACTIVE CASE SCOPE
        </div>
        {activeCase ? (
          <>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
              {activeCase.case_number}
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {activeCase.title}
            </div>
          </>
        ) : (
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No case selected — select from Cases tab
          </div>
        )}
      </div>

      {/* AI Agent pipeline */}
      <div className="glass-panel-elevated" style={{ padding: '0.875rem' }}>
        <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 10 }}>
          MULTI-AGENT PIPELINE
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {AGENTS.map(agent => (
            <div key={agent.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: agent.color, flexShrink: 0 }} />
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', flex: 1 }}>{agent.label}</span>
              <span style={{ fontSize: '0.5625rem', color: agent.color, fontWeight: 600 }}>READY</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cited sources */}
      {sources.length > 0 && (
        <div className="glass-panel-elevated" style={{ padding: '0.875rem' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--cyan)', letterSpacing: '0.08em', marginBottom: 8 }}>
            CITED SOURCES ({sources.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sources.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={10} color="var(--success)" />
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Network preview */}
      {hasNodes && (
        <div className="glass-panel-elevated" style={{ padding: '0.875rem' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--cyan)', letterSpacing: '0.08em', marginBottom: 8 }}>
            ENTITY GRAPH PREVIEW
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {networkData.nodes.slice(0, 6).map(n => {
              const clr = n.type === 'SUSPECT' ? 'var(--danger)' : n.type === 'OFFICER' ? 'var(--cyan)' : n.type === 'EVIDENCE' ? 'var(--success)' : 'var(--accent)';
              return (
                <span key={n.id} style={{
                  fontSize: '0.5625rem', fontWeight: 600, padding: '2px 7px', borderRadius: 12,
                  background: `${clr}14`, border: `1px solid ${clr}30`, color: clr, whiteSpace: 'nowrap',
                }}>
                  {n.label}
                </span>
              );
            })}
          </div>
          <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', marginTop: 6 }}>
            Switch to Network tab for full interactive graph
          </div>
        </div>
      )}

      {/* Legal quick ref */}
      <div className="glass-panel-elevated" style={{ padding: '0.875rem' }}>
        <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--success)', letterSpacing: '0.08em', marginBottom: 8 }}>
          SUGGESTED QUERIES
        </div>
        {[
          'Summarize the evidence timeline',
          'Which BNS sections apply?',
          'Find similar historical cases',
          'Generate prosecution brief',
        ].map(q => (
          <div key={q} style={{
            fontSize: '0.6875rem', color: 'var(--text-secondary)', padding: '4px 0',
            borderBottom: '1px solid var(--bg-border)', cursor: 'default',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <ChevronRight size={10} color="var(--text-muted)" />
            {q}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main ChatDashboard ────────────────────────────────────────
export default function ChatDashboard() {
  const { chatMessages, chatStreaming, streamChatResponse } = useStore();
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Scroll to bottom on each new message / stream update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatMessages.at(-1)?.content]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || chatStreaming) return;
    setInput('');
    await streamChatResponse(text);
    inputRef.current?.focus();
  }, [input, chatStreaming, streamChatResponse]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const lastMsg = chatMessages.filter(m => m.role === 'assistant').at(-1);

  return (
    <div style={{ display: 'flex', height: '100%', gap: 12, overflow: 'hidden' }}>

      {/* ── Left: Chat ── */}
      <div className="glass-panel" style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0,
      }}>
        {/* Header */}
        <div style={{
          padding: '0.875rem 1rem', borderBottom: '1px solid var(--bg-border)',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: chatStreaming ? 'var(--success)' : 'var(--text-muted)', transition: 'background 0.3s' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
            AI INVESTIGATION CO-PILOT
          </span>
          {chatStreaming && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', fontSize: '0.625rem', color: 'var(--accent)' }}>
              <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
              Agents processing...
            </span>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {chatMessages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--bg-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this case, request legal mapping, or generate a briefing..."
              disabled={chatStreaming}
              rows={2}
              style={{
                flex: 1, resize: 'none', background: 'var(--bg-base)',
                border: '1px solid var(--bg-border)', borderRadius: 8,
                color: 'var(--text-primary)', fontSize: '0.8125rem', padding: '0.625rem 0.875rem',
                fontFamily: 'var(--font-sans)', outline: 'none', lineHeight: 1.5,
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
              onBlur={e  => { e.target.style.borderColor = 'var(--bg-border)'; }}
            />
            <button
              onClick={handleSend}
              disabled={chatStreaming || !input.trim()}
              className="btn-primary"
              style={{ padding: '0.625rem', borderRadius: 8, flexShrink: 0 }}
              title="Send (Enter)"
            >
              {chatStreaming ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
            </button>
          </div>
          <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', marginTop: 4, paddingLeft: 2 }}>
            Enter to send · Shift+Enter for new line · Powered by VAJRA Multi-Agent Team
          </div>
        </div>
      </div>

      {/* ── Right: Contextual data ── */}
      <div style={{ width: 240, flexShrink: 0, overflow: 'hidden' }}>
        <ContextPanel lastMsg={lastMsg} />
      </div>

      {/* Spin animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
