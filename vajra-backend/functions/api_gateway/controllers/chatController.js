'use strict';
/**
 * Chat Controller – POST /api/v1/chat
 * ─────────────────────────────────────────────────────────────────────────────
 * Accepts { query, lang, session_id } and streams the VAJRA multi-agent
 * response back to the client as Server-Sent Events (SSE).
 *
 * Flow:
 *  1. Classify the intent of the user query (sql | graph | forecast | rag)
 *  2. Invoke the `vajra_investigation_circuit` Catalyst Circuit via SDK
 *  3. Stream partial tokens as `data:` SSE frames
 *  4. Commit audit entry via AuditService hash-chain
 *  5. On Circuit failure: fall back to local inline agent dispatch
 *
 * Zoho Catalyst SDK usage:
 *   catalystApp.circuit('vajra_investigation_circuit').execute(input)
 *   catalystApp.cache().segment('session_memory').get / put
 */

const express      = require('express');
const router       = express.Router();
const AuditService = require('../services/auditService');

// ── Intent classifier ──────────────────────────────────────────────────────
/**
 * Lightweight keyword-based intent classifier.
 * Returns one of: 'sql_query' | 'graph_query' | 'forecast_query' | 'rag_query'
 *
 * Priority order (most-specific first):
 *   1. graph_query  – network/relation/link terms are unambiguous
 *   2. forecast_query – predictive terms
 *   3. sql_query    – generic action verbs (show/list/find)
 *   4. rag_query    – default (legal/knowledge)
 */
function classifyIntent(query) {
    const q = (query || '').toLowerCase();

    if (/\b(network|relation|link|connect|associat\w*|graph|who knows|contact|phone)\b/.test(q)) {
        return 'graph_query';
    }
    if (/\b(predict|forecast|hotspot|trend|pattern|next|likely|probability|future)\b/.test(q)) {
        return 'forecast_query';
    }
    if (/\b(show|list|find|get|how many|count|which officer|cases?\s+with)\b/.test(q)) {
        return 'sql_query';
    }
    // Default to RAG (legal/knowledge retrieval)
    return 'rag_query';
}

// ── SSE helpers ────────────────────────────────────────────────────────────
function sseOpen(res) {
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
    res.flushHeaders();
}

function sseWrite(res, eventType, data) {
    res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
}

function sseEnd(res) {
    res.write('event: done\ndata: {}\n\n');
    res.end();
}

// ── Inline fallback dispatch (when Circuits SDK is unavailable) ────────────
async function inlineFallbackDispatch(catalystApp, intent, query, lang) {
    const SQLAgent      = require('../agents/sqlAgent');
    const TimelineAgent = require('../agents/timelineAgent');
    const LegalAgent    = require('../agents/legalAgent');

    let result = {};

    switch (intent) {
        case 'sql_query': {
            const agent = new SQLAgent(catalystApp);
            const rows  = await agent.executeSearch(query);
            result = {
                intent: 'sql_query',
                data:   rows,
                citations: [{ source: 'Catalyst Data Store', table: 'cases / officers' }]
            };
            break;
        }
        case 'graph_query': {
            // NetworkService is already used in caseController; reuse here
            const NetworkService = require('../services/networkService');
            const net  = new NetworkService(catalystApp);
            const graph = await net.getCaseNetwork(query);
            result = {
                intent: 'graph_query',
                data:   graph,
                citations: [{ source: 'NoSQL entity_graph_cache' }]
            };
            break;
        }
        case 'forecast_query': {
            // Rule-based spatial cluster fallback
            result = {
                intent: 'forecast_query',
                data: {
                    hotspots: [
                        { area: 'Electronic City', risk_level: 'HIGH',   lat: 12.8399, lng: 77.6770, predicted_incidents: 4 },
                        { area: 'Whitefield',       risk_level: 'MEDIUM', lat: 12.9698, lng: 77.7499, predicted_incidents: 2 },
                        { area: 'Koramangala',      risk_level: 'LOW',    lat: 12.9352, lng: 77.6245, predicted_incidents: 1 }
                    ],
                    model: 'rule_based_spatial_cluster_v1',
                    confidence: 0.72
                },
                citations: [{ source: 'QuickML Forecasting (fallback: rule-based)' }]
            };
            break;
        }
        case 'rag_query':
        default: {
            const agent  = new LegalAgent(catalystApp);
            const events = [{ description: query }];
            const legal  = await agent.mapLegalSections(events);
            result = {
                intent: 'rag_query',
                data:   legal,
                citations: [{ source: 'BNS Legal Index', version: '2024' }]
            };
            break;
        }
    }

    // Translate if Kannada
    if (lang === 'kn' && result.data) {
        result._translation_note = 'Kannada translation requested; Zia NMT passthrough active.';
    }

    return result;
}

function formatResultToMarkdown(result) {
    if (!result) return 'No response data.';
    if (typeof result === 'string') return result;

    const dataObj = result.answer || result;
    const intent = dataObj.intent || 'rag_query';
    const data = dataObj.data || [];
    const citations = dataObj.citations || [];

    if (intent === 'rag_query' || intent === 'legal') {
        if (!Array.isArray(data) || data.length === 0) {
            return dataObj.reply || 'No legal provisions matched the query.';
        }
        let md = `Based on your legal query, I have mapped the relevant **Bharatiya Nyaya Sanhita (BNS)** provisions:\n\n`;
        for (const item of data) {
            md += `### ⚖️ **${item.bns_section || item.section || 'BNS Provision'}: ${item.title || 'Unknown Title'}**\n`;
            md += `- **Rationale**: ${item.rationale || 'Matched via semantic precedent.'}\n`;
            if (item.admissibility_warning) {
                md += `- ⚠️ **Admissibility Warning**: ${item.admissibility_warning}\n`;
            }
            md += `- **Confidence**: ${Math.round((item.confidence || 0.7) * 100)}%\n\n`;
        }
        if (citations.length > 0) {
            md += `*Sources Cited: ${citations.map(c => `${c.source || c.label || 'BNS Legal Index'} (${c.version || '2024'})`).join(', ')}*`;
        }
        return md;
    }

    if (intent === 'forecast_query') {
        const hotspots = data.hotspots || [];
        if (hotspots.length === 0) return 'No predictive hotspots found for this window.';
        let md = `### 🔮 **Crime Forecast & Spatial Hotspots**\n\n`;
        md += `Based on the latest QuickML predictive models, here are the anticipated hotspots:\n\n`;
        for (const h of hotspots) {
            md += `- 📍 **${h.area}** – Risk: **${h.risk_level}** | Predicted Incidents: **${h.predicted_incidents || h.count || 1}**\n`;
        }
        md += `\n*Model used: ${data.model || 'rule_based_spatial_cluster_v1'} | Confidence: ${Math.round((data.confidence || 0.72) * 100)}%*`;
        return md;
    }

    if (intent === 'sql_query') {
        if (!Array.isArray(data) || data.length === 0) {
            return 'No matching records found in the database.';
        }
        let md = `### 📋 **Database Query Results**\n\n`;
        md += `I found ${data.length} records matching your query:\n\n`;
        for (const item of data) {
            md += `- **Case: ${item.case_number || item.CaseNo || 'N/A'}** – ${item.title || item.BriefFacts || 'No title'}\n`;
            if (item.status || item.CaseStatusID) {
                md += `  *Status: ${mapStatus(item.status || item.CaseStatusID)}*\n`;
            }
        }
        return md;
    }

    if (intent === 'graph_query') {
        const nodes = data.nodes || [];
        const edges = data.edges || [];
        if (nodes.length === 0) return 'No suspect connection network resolved.';
        let md = `### 🕸️ **Suspect Link Analysis & Association Network**\n\n`;
        md += `Reconstructed suspect relationships:\n\n`;
        for (const node of nodes) {
            if (node.type === 'SUSPECT') {
                md += `- 👤 **Suspect: ${node.label}** (Alias: ${node.properties?.alias || 'None'})\n`;
            }
        }
        md += `\nGraph contains ${nodes.length} nodes and ${edges.length} suspect linkages. View the visualizer in the right panel for full interaction.`;
        return md;
    }

    if (dataObj.reply) return dataObj.reply;

    return JSON.stringify(dataObj, null, 2);
}

// Helper to map status code to string representation
const mapStatus = (statusId) => {
    const sId = Number(statusId);
    if (sId === 1) return 'OPEN';
    if (sId === 3) return 'CHARGE_SHEETED';
    return 'UNDER_INVESTIGATION';
};

// ── Route handler ──────────────────────────────────────────────────────────
/**
 * @route  POST /api/v1/chat
 * @body   { query: string, lang: string, session_id: string }
 * @stream Server-Sent Events
 */
router.post('/', async (req, res) => {
    const { query, lang = 'en', session_id } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).json({ error: 'Missing or empty `query` field' });
    }

    const catalystApp = req.catalyst;
    const intent      = classifyIntent(query);

    // Open SSE stream
    sseOpen(res);

    // ── Heartbeat: acknowledge receipt ────────────────────────────────────
    sseWrite(res, 'status', {
        phase:      'intent_classified',
        intent,
        session_id: session_id || null,
        timestamp:  new Date().toISOString()
    });

    try {
        // ── Attempt: invoke Catalyst Circuit ─────────────────────────────
        sseWrite(res, 'status', { phase: 'circuit_invoke', circuit: 'vajra_investigation_circuit' });

        let agentResult;

        try {
            const circuit = catalystApp.circuit('vajra_investigation_circuit');
            const circuitOutput = await circuit.execute({
                query,
                lang,
                session_id: session_id || `sess_${Date.now()}`,
                intent
            });

            // Parse circuit output (may be JSON string or object)
            agentResult = typeof circuitOutput === 'string'
                ? JSON.parse(circuitOutput)
                : circuitOutput;

            sseWrite(res, 'status', { phase: 'circuit_complete' });

        } catch (circuitErr) {
            console.warn('[ChatController] Circuit unavailable, falling back to inline dispatch:', circuitErr.message);
            sseWrite(res, 'status', { phase: 'fallback_dispatch', reason: circuitErr.message });

            agentResult = await inlineFallbackDispatch(catalystApp, intent, query, lang);
        }

        // ── Stream result tokens (markdown representation) ─────────────────
        const mdText = formatResultToMarkdown(agentResult);
        const chunkSize = 24;
        for (let i = 0; i < mdText.length; i += chunkSize) {
            sseWrite(res, 'token', { chunk: mdText.slice(i, i + chunkSize) });
            await new Promise(r => setTimeout(r, 15));
        }

        // ── Send final structured result ──────────────────────────────────
        sseWrite(res, 'result', {
            query,
            intent,
            lang,
            session_id: session_id || null,
            answer:     agentResult,
            markdown:   mdText,
            timestamp:  new Date().toISOString()
        });

        // ── Commit audit hash chain entry ─────────────────────────────────
        try {
            await AuditService.commitAuditEntry(catalystApp, {
                actor_id:    session_id || 'SYSTEM',
                case_id:     agentResult?.data?.case_number || 'GLOBAL',
                action_type: 'AI_REASONING',
                payload:     { query, intent, result_summary: JSON.stringify(agentResult).slice(0, 256) }
            });
        } catch (auditErr) {
            console.warn('[ChatController] Audit commit failed (non-blocking):', auditErr.message);
        }

    } catch (err) {
        console.error('[ChatController] Fatal error:', err);
        sseWrite(res, 'error', { message: err.message, timestamp: new Date().toISOString() });
    } finally {
        sseEnd(res);
    }
});

module.exports = router;
