'use strict';
/**
 * Agent Orchestrator – Zoho Catalyst Function
 * ─────────────────────────────────────────────────────────────────────────────
 * Coordinates multi-agent workflows invoked by:
 *   1. Direct HTTP calls (from api_gateway fallback)
 *   2. Catalyst Circuits states (vajra_investigation_circuit)
 *   3. Event-triggered jobs (fir_ingest_event)
 *
 * Supported task_type values:
 *   RECONSTRUCT_TIMELINE  – Extract timeline events from raw text
 *   MAP_LEGAL_SECTIONS    – Map facts to BNS sections
 *   QUERY_DATABASE        – Natural language → SQL search
 *   RESOLVE_GRAPH         – Entity network graph resolution
 *   FORECAST_HOTSPOTS     – QuickML crime pattern prediction
 *   RAG_RETRIEVE          – Knowledge base retrieval
 *   TRANSLATE_IF_KN       – Zia NMT Kannada → English
 *   MERGE_AND_CITE        – Aggregate parallel branch outputs + citations
 *   AUDIT_LEDGER_POST     – Commit hash-chained audit entry
 */

const catalyst          = require('zcatalyst-sdk-node');
const TimelineAgent     = require('./agents/timelineAgent');
const LegalAgent        = require('./agents/legalAgent');
const SQLAgent          = require('./agents/sqlAgent');
const GraphAgent        = require('./agents/graphAgent');
const ForecastAgent     = require('./agents/forecastAgent');
const RAGAgent          = require('./agents/ragAgent');
const TranslationAgent  = require('./agents/translationAgent');

// AuditService is in api_gateway – use a local re-implementation here
// to keep functions independent (Catalyst deploys each function separately)
const crypto = require('crypto');

/**
 * Lightweight in-function audit commit (mirrors auditService.js in api_gateway).
 * Kept separate so agent_orchestrator has no cross-function file dependency.
 */
async function commitAuditEntry(catalystApp, { actor_id, case_id, action_type, payload }) {
    const timestamp   = new Date().toISOString();
    const action_id   = `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const payloadJson = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
    let   prev_hash   = '0'.repeat(64);

    try {
        const db   = catalystApp.datastore();
        const rows = await db.executeQueries(
            `SELECT entry_hash FROM audit_log ORDER BY ROWID DESC LIMIT 1`
        );
        if (rows && rows.length > 0 && rows[0].audit_log?.entry_hash) {
            prev_hash = rows[0].audit_log.entry_hash;
        }
        const raw        = `${prev_hash}|${actor_id}|${case_id}|${action_type}|${payloadJson}|${timestamp}`;
        const entry_hash = crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
        await db.table('audit_log').insertRow({
            action_id, actor_id, case_id, action_type,
            payload_hash: crypto.createHash('sha256').update(payloadJson, 'utf8').digest('hex'),
            prev_hash, entry_hash, created_time: timestamp
        });
        return { action_id, entry_hash, prev_hash };
    } catch (err) {
        console.warn('[Orchestrator:AuditCommit] degraded:', err.message);
        const raw        = `${prev_hash}|${actor_id}|${case_id}|${action_type}|${payloadJson}|${timestamp}`;
        const entry_hash = crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
        return { action_id, entry_hash, prev_hash, degraded: true };
    }
}

/**
 * MergeAndCite – aggregates parallel branch outputs into one canonical response.
 * Selects the primary branch (matching intent), attaches all other branches as
 * supplementary context, and builds a source citation list.
 */
function mergeAndCite(circuitState) {
    const intent          = circuitState.intent || 'rag_query';
    const parallelResults = circuitState.parallel_results || [];
    const translatedData  = circuitState.translated_results;

    // Build a map of branch name → result
    const branchMap = {};
    for (const branch of parallelResults) {
        const name = branch.branch || branch.task || 'unknown';
        branchMap[name] = branch;
    }

    // Primary answer = the branch matching intent, or first non-empty branch
    let primaryData = branchMap[intent]?.data
        || Object.values(branchMap).find(b => b.data && Object.keys(b.data).length > 0)?.data
        || {};

    // If translation happened, prefer translated data
    if (translatedData && translatedData.translated) {
        primaryData = { ...primaryData, _translation: translatedData };
    }

    // Compute aggregate confidence
    const confidences = parallelResults
        .filter(b => typeof b.confidence === 'number')
        .map(b => b.confidence);
    const avgConfidence = confidences.length > 0
        ? (confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(2)
        : 0.80;

    // Build citations
    const citations = [
        { source: 'Catalyst Data Store – cases / evidence tables', type: 'sql' },
        { source: 'NoSQL entity_graph_cache – criminal network',   type: 'graph' },
        { source: 'QuickML RAG Knowledge Base – legal documents',  type: 'rag' },
        { source: 'QuickML Forecasting Model',                     type: 'forecast' }
    ].filter(c => {
        if (intent === 'sql_query'      && c.type === 'sql')      return true;
        if (intent === 'graph_query'    && c.type === 'graph')    return true;
        if (intent === 'forecast_query' && c.type === 'forecast') return true;
        if (intent === 'rag_query'      && c.type === 'rag')      return true;
        return false;
    });

    return {
        status:             'SUCCESS',
        intent,
        primary_data:       primaryData,
        supplementary:      Object.fromEntries(
            Object.entries(branchMap).filter(([k]) => k !== intent)
        ),
        citations,
        confidence:         parseFloat(avgConfidence),
        session_id:         circuitState.session_id || null,
        timestamp:          new Date().toISOString()
    };
}

// ── Main handler ───────────────────────────────────────────────────────────
module.exports = async (context, basicIO) => {
    try {
        const catalystApp = catalyst.initialize(context);

        // Input arguments from Circuit state or direct invocation
        const taskType = basicIO.getArgument('task_type');
        const rawPayload = basicIO.getArgument('payload');
        const lang     = basicIO.getArgument('lang') || 'en';
        const intentArg= basicIO.getArgument('intent') || 'rag_query';
        const sessionId= basicIO.getArgument('session_id') || 'SYSTEM';

        // Deserialize payload if it arrived as a JSON string
        const payload = (() => {
            if (!rawPayload) return '';
            if (typeof rawPayload === 'string') {
                try { return JSON.parse(rawPayload); } catch { return rawPayload; }
            }
            return rawPayload;
        })();

        if (!taskType) {
            basicIO.write(JSON.stringify({ error: 'Missing task_type argument' }));
            context.close();
            return;
        }

        let result = null;

        switch (taskType) {

            // ── Existing tasks (preserved) ────────────────────────────────
            case 'RECONSTRUCT_TIMELINE': {
                const agent = new TimelineAgent(catalystApp);
                result = { branch: 'timeline', events: await agent.extractEvents(String(payload)) };
                break;
            }

            case 'MAP_LEGAL_SECTIONS': {
                const agent      = new LegalAgent(catalystApp);
                const eventsArr  = Array.isArray(payload) ? payload : [{ description: String(payload) }];
                result = { branch: 'legal', recommendations: await agent.mapLegalSections(eventsArr) };
                break;
            }

            case 'QUERY_DATABASE': {
                const agent = new SQLAgent(catalystApp);
                result = { branch: 'sql_query', data: await agent.executeSearch(String(payload)) };
                break;
            }

            // ── New tasks ─────────────────────────────────────────────────
            case 'RESOLVE_GRAPH': {
                const agent = new GraphAgent(catalystApp);
                const graphResult = await agent.resolveGraph(String(payload));
                result = { branch: 'graph_query', data: graphResult, confidence: 0.85 };
                break;
            }

            case 'FORECAST_HOTSPOTS': {
                const agent = new ForecastAgent(catalystApp);
                const forecast = await agent.predictHotspots(String(payload));
                result = { branch: 'forecast_query', data: forecast, confidence: forecast.confidence || 0.72 };
                break;
            }

            case 'RAG_RETRIEVE': {
                const agent = new RAGAgent(catalystApp);
                const retrieved = await agent.retrieve(String(payload));
                result = { branch: 'rag_query', data: retrieved, confidence: 0.88 };
                break;
            }

            case 'TRANSLATE_IF_KN': {
                const agent = new TranslationAgent(catalystApp);
                // payload here is the array of parallel branch results
                const query = typeof payload === 'object' && payload.query
                    ? payload.query
                    : JSON.stringify(payload);
                const translation = await agent.translateIfKannada(query, lang);
                result = translation;
                break;
            }

            case 'MERGE_AND_CITE': {
                // payload = full circuit state object
                const circuitState = typeof payload === 'object' ? payload : {};
                circuitState.intent = intentArg;
                result = mergeAndCite(circuitState);
                break;
            }

            case 'AUDIT_LEDGER_POST': {
                const payloadStr = typeof payload === 'object'
                    ? JSON.stringify(payload).slice(0, 512)
                    : String(payload || '');

                result = await commitAuditEntry(catalystApp, {
                    actor_id:    sessionId,
                    case_id:     (typeof payload === 'object' && payload.case_id) ? payload.case_id : 'GLOBAL',
                    action_type: 'AI_REASONING',
                    payload:     payloadStr
                });
                break;
            }

            default:
                result = { error: `Unsupported task_type: ${taskType}` };
        }

        basicIO.write(JSON.stringify({
            status:    result?.error ? 'ERROR' : 'SUCCESS',
            task:      taskType,
            data:      result,
            timestamp: new Date().toISOString()
        }));

    } catch (err) {
        console.error('[AgentOrchestrator] Execution failure:', err);
        basicIO.write(JSON.stringify({
            status:    'ERROR',
            error:     err.message,
            timestamp: new Date().toISOString()
        }));
    } finally {
        context.close();
    }
};
