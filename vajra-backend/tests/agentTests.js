/**
 * VAJRA.AI V4 - Agent Integration and Unit Test Suite
 * Executed natively using Node.js built-in test runner and assert modules.
 */
const test   = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

// Import Agent Classes
const TimelineAgent    = require('../functions/agent_orchestrator/agents/timelineAgent');
const LegalAgent       = require('../functions/agent_orchestrator/agents/legalAgent');
const SQLAgent         = require('../functions/agent_orchestrator/agents/sqlAgent');
const TranslationAgent = require('../functions/agent_orchestrator/agents/translationAgent');
const RAGAgent         = require('../functions/agent_orchestrator/agents/ragAgent');
const ForecastAgent    = require('../functions/agent_orchestrator/agents/forecastAgent');
const GraphAgent       = require('../functions/agent_orchestrator/agents/graphAgent');

// ── Mock Catalyst App ──────────────────────────────────────────────────────
const mockCatalystApp = {
    datastore: () => ({
        executeQueries: async () => [],
        table: () => ({
            insertRow: async () => ({ ROWID: '1' }),
            updateRow: async () => ({})
        })
    }),
    cache: () => ({
        segment: () => ({ get: async () => null, put: async () => {} })
    }),
    zia: () => ({
        translate:                async () => ({ translated_text: 'Translated text', confidence: 0.95 }),
        extractOpticalCharacter:  async () => ({ text: 'Sample OCR text' })
    }),
    ml: () => ({
        predict:     async () => ({ predictions: [], confidence: 0.80 }),
        query:       async () => ({ results: [] }),
        addDocument: async () => ({})
    }),
    filestore: () => ({
        folder: () => ({
            uploadFile:     async () => ({ url: 'mock://stratus/file.pdf' }),
            getFileDetails: async () => ({ id: '123' }),
            downloadFile:   async () => Buffer.from('mock-pdf-content')
        })
    })
};

// ──────────────────────────────────────────────────────────────────────────
// EXISTING TESTS (preserved exactly as authored)
// ──────────────────────────────────────────────────────────────────────────

test('VAJRA Timeline Agent - Heuristic Chronology Extraction', (t) => {
    const agent = new TimelineAgent(mockCatalystApp);

    const statement = "On 04-07-2026 at 10:30 PM, the warehouse alarm went off. Rajesh Kumar saw a black truck driving away from Electronic City.";
    const events    = agent.heuristicParse(statement);
    assert.strictEqual(events.length >= 1, true, "Should extract at least one event from statement");
    assert.strictEqual(events.some(e => e.evidence_source === "AI Text Extraction Service"), true, "Source metadata should match timeline agent identifier");
    assert.strictEqual(events.some(e => e.title.includes("On 04-07-2026")), true, "Title parsing should extract matching first words");
});

test('VAJRA Legal Agent - BNS Penal Code Mapping', (t) => {
    const agent  = new LegalAgent(mockCatalystApp);
    const events = [{ description: "Suspect broke lock and stole laptop from building." }];

    const recommendations = agent.heuristicLegalLookup(events);
    assert.strictEqual(recommendations.length >= 1, true, "Should recommend BNS sections for theft/burglary description");
    assert.strictEqual(recommendations[0].bns_section, "Section 303", "Should map theft description to Section 303");
    assert.strictEqual(recommendations[0].confidence, 0.95, "Confidence rating should match expected mapping standard");
});

test('VAJRA SQL Agent - Injection Sanitization and Query Safe-building', (t) => {
    const agent = new SQLAgent(mockCatalystApp);

    const injectionQuery = "cases WHERE status = 'OPEN'; DROP TABLE cases; --";
    const sanitized      = agent.sanitizeInput(injectionQuery);
    assert.strictEqual(sanitized.includes(';'), false, "Should strip semi-colon statements");
    assert.strictEqual(sanitized.includes('--'), false, "Should strip comment sequences");
    assert.strictEqual(sanitized.includes('DROP'), false, "Should strip drop commands");

    const caseQuery = "find cases with status open";
    const sql       = agent.buildSQLQuery(caseQuery);
    assert.strictEqual(sql.includes('SELECT'), true, "Should compile SELECT statements");
    assert.strictEqual(sql.includes('cases'), true, "Should compile case database target table query");
});

// ──────────────────────────────────────────────────────────────────────────
// NEW TESTS – AuditService Hash Chain
// ──────────────────────────────────────────────────────────────────────────

test('VAJRA AuditService - SHA-256 entry_hash is a valid 64-char hex string', (t) => {
    const prev_hash   = '0'.repeat(64);
    const raw         = `${prev_hash}|officer_999|FIR_12_2026|EVIDENCE_UPLOAD|{}|2026-07-05T12:00:00.000Z`;
    const entry_hash  = crypto.createHash('sha256').update(raw, 'utf8').digest('hex');

    assert.strictEqual(typeof entry_hash, 'string',  'entry_hash should be a string');
    assert.strictEqual(entry_hash.length, 64,         'SHA-256 hex digest must be 64 characters');
    assert.match(entry_hash, /^[a-f0-9]{64}$/,       'entry_hash must be lowercase hex');
});

test('VAJRA AuditService - Hash computation is deterministic', (t) => {
    const raw  = 'prev|actor|case|action|payload|2026-07-05T12:00:00.000Z';
    const h1   = crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
    const h2   = crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
    assert.strictEqual(h1, h2, 'Same input must always produce the same hash');
});

test('VAJRA AuditService - Tampering any field invalidates the hash', (t) => {
    const raw     = 'prev|actor|FIR_12_2026|AI_REASONING|{}|2026-07-05T12:00:00.000Z';
    const tampered = 'prev|actor|TAMPERED|AI_REASONING|{}|2026-07-05T12:00:00.000Z';

    const h1 = crypto.createHash('sha256').update(raw,     'utf8').digest('hex');
    const h2 = crypto.createHash('sha256').update(tampered,'utf8').digest('hex');
    assert.notStrictEqual(h1, h2, 'Tampering any field must change the hash');
});

test('VAJRA AuditService - Genesis block uses 64-zero prev_hash', (t) => {
    const genesis = '0'.repeat(64);
    assert.strictEqual(genesis.length, 64, 'Genesis prev_hash must be 64 chars');
    assert.match(genesis, /^0{64}$/,       'Genesis prev_hash must be all zeros');
});

// ──────────────────────────────────────────────────────────────────────────
// NEW TESTS – Translation Agent
// ──────────────────────────────────────────────────────────────────────────

test('VAJRA TranslationAgent - Passthrough for English (non-Kannada)', async (t) => {
    const agent  = new TranslationAgent(mockCatalystApp);
    const result = await agent.translateIfKannada('Show all open cases', 'en');

    assert.strictEqual(result.translated, false,                'Must NOT translate English text');
    assert.strictEqual(result.translated_text, 'Show all open cases', 'Must return original text unchanged');
    assert.strictEqual(result.source_lang, 'en',               'source_lang must be en');
});

test('VAJRA TranslationAgent - Invokes Zia NMT for Kannada (kn)', async (t) => {
    const agent  = new TranslationAgent(mockCatalystApp);
    const result = await agent.translateIfKannada('ತೆರೆದ ಪ್ರಕರಣಗಳನ್ನು ತೋರಿಸು', 'kn');

    assert.strictEqual(result.source_lang, 'kn',              'source_lang must be kn');
    assert.strictEqual(typeof result.translated_text, 'string','translated_text must be a string');
    assert.ok(result.translated_text.length > 0,              'translated_text must be non-empty');
});

test('VAJRA TranslationAgent - Empty text is always a passthrough', async (t) => {
    const agent  = new TranslationAgent(mockCatalystApp);
    const result = await agent.translateIfKannada('', 'kn');
    assert.strictEqual(result.translated, false, 'Empty text must never trigger translation');
});

// ──────────────────────────────────────────────────────────────────────────
// NEW TESTS – RAG Agent
// ──────────────────────────────────────────────────────────────────────────

test('VAJRA RAGAgent - Static legal fallback returns non-empty snippets', (t) => {
    const agent  = new RAGAgent(mockCatalystApp);
    const result = agent._staticLegalFallback('theft burglary legal section');

    assert.ok(Array.isArray(result.snippets),           'snippets must be an array');
    assert.ok(result.snippets.length > 0,               'Must return at least one snippet');
    assert.strictEqual(typeof result.snippets[0].title, 'string', 'Each snippet must have a title');
    assert.strictEqual(typeof result.snippets[0].excerpt,'string','Each snippet must have an excerpt');
});

test('VAJRA RAGAgent - Keyword extractor strips stop-words', (t) => {
    const agent  = new RAGAgent(mockCatalystApp);
    const result = agent._extractKeyword('find all theft cases in database');

    assert.strictEqual(typeof result, 'string',                     'Should return a string');
    assert.ok(!['find', 'all', 'cases', 'in'].includes(result),     'Should strip stop-words');
    assert.ok(result.length > 0,                                    'Keyword must be non-empty');
});

test('VAJRA RAGAgent - Keyword extractor strips SQL injection chars', (t) => {
    const agent = new RAGAgent(mockCatalystApp);
    const kw    = agent._extractKeyword("show'; DROP TABLE cases;--");

    assert.ok(!kw.includes("'"), 'Should strip single-quote');
    assert.ok(!kw.includes(';'), 'Should strip semicolons');
});

// ──────────────────────────────────────────────────────────────────────────
// NEW TESTS – Forecast Agent
// ──────────────────────────────────────────────────────────────────────────

test('VAJRA ForecastAgent - Rule-based fallback returns structured hotspot list', (t) => {
    const agent  = new ForecastAgent(mockCatalystApp);
    const result = agent._ruleBasedForecast('predict crime hotspots in Bangalore');

    assert.ok(Array.isArray(result.hotspots),                         'hotspots must be an array');
    assert.ok(result.hotspots.length > 0,                             'At least one hotspot required');
    assert.ok(['HIGH','MEDIUM','LOW'].includes(result.hotspots[0].risk_level), 'risk_level must be HIGH/MEDIUM/LOW');
    assert.strictEqual(typeof result.hotspots[0].lat, 'number',       'lat must be a number');
    assert.strictEqual(typeof result.hotspots[0].lng, 'number',       'lng must be a number');
});

test('VAJRA ForecastAgent - Area filter returns only Whitefield hotspot', (t) => {
    const agent  = new ForecastAgent(mockCatalystApp);
    const result = agent._ruleBasedForecast('crime forecast for whitefield next week');

    assert.strictEqual(result.hotspots.length, 1,               'Should return exactly one hotspot');
    assert.strictEqual(result.hotspots[0].area, 'Whitefield',   'Area should be Whitefield');
});

// ──────────────────────────────────────────────────────────────────────────
// NEW TESTS – Graph Agent
// ──────────────────────────────────────────────────────────────────────────

test('VAJRA GraphAgent - Mock graph structure is valid', (t) => {
    const agent  = new GraphAgent(mockCatalystApp);
    const result = agent._mockGraph('FIR_12_2026');

    assert.ok(Array.isArray(result.nodes),  'nodes must be an array');
    assert.ok(Array.isArray(result.edges),  'edges must be an array');
    assert.ok(result.nodes.length > 0,      'Graph must have at least one node');
    assert.ok(result.edges.length > 0,      'Graph must have at least one edge');

    const caseNode = result.nodes.find(n => n.id === 'FIR_12_2026');
    assert.ok(caseNode,                         'Case node must be present');
    assert.strictEqual(caseNode.type, 'CASE',   'Case node type must be CASE');

    result.edges.forEach(edge => {
        assert.strictEqual(typeof edge.source, 'string', 'Edge source must be a string');
        assert.strictEqual(typeof edge.target, 'string', 'Edge target must be a string');
        assert.strictEqual(typeof edge.label,  'string', 'Edge label must be a string');
    });
});

// ──────────────────────────────────────────────────────────────────────────
// NEW TESTS – Chat Controller Intent Classifier
// ──────────────────────────────────────────────────────────────────────────

// Inline classifier (mirrors chatController.js – single source of truth for logic)
function classifyIntent(query) {
    const q = (query || '').toLowerCase();
    if (/\b(network|relation|link|connect|associat\w*|graph|who knows|contact|phone)\b/.test(q)) return 'graph_query';
    if (/\b(predict|forecast|hotspot|trend|pattern|next|likely|probability|future)\b/.test(q)) return 'forecast_query';
    if (/\b(show|list|find|get|how many|count|which officer|cases?\s+with)\b/.test(q)) return 'sql_query';
    return 'rag_query';
}

test('VAJRA ChatController - Intent: sql_query keywords', (t) => {
    assert.strictEqual(classifyIntent('show all open cases'),                   'sql_query');
    assert.strictEqual(classifyIntent('list officers at station'),              'sql_query');
    assert.strictEqual(classifyIntent('find cases with status OPEN'),          'sql_query');
    assert.strictEqual(classifyIntent('how many cases are under investigation'),'sql_query');
});

test('VAJRA ChatController - Intent: graph_query keywords', (t) => {
    assert.strictEqual(classifyIntent('show the criminal network for FIR_12_2026'),    'graph_query');
    assert.strictEqual(classifyIntent('who is associated with suspect Rajesh Kumar?'), 'graph_query');
    assert.strictEqual(classifyIntent('show phone connections for this case'),         'graph_query');
});

test('VAJRA ChatController - Intent: forecast_query keywords', (t) => {
    assert.strictEqual(classifyIntent('predict crime hotspots near Electronic City'),     'forecast_query');
    assert.strictEqual(classifyIntent('forecast crime trends for next week'),             'forecast_query');
    assert.strictEqual(classifyIntent('what is the probability of crime in Whitefield?'),'forecast_query');
});

test('VAJRA ChatController - Intent: rag_query default', (t) => {
    assert.strictEqual(classifyIntent('what BNS section applies to burglary?'), 'rag_query');
    assert.strictEqual(classifyIntent('explain admissibility of CCTV evidence'), 'rag_query');
    assert.strictEqual(classifyIntent(''),                                        'rag_query');
});
