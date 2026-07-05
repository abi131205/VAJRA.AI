/**
 * VAJRA.AI V4 - Agent Integration and Unit Test Suite
 * Executed natively using Node.js built-in test runner and assert modules.
 */
const test = require('node:test');
const assert = require('node:assert');

// Import Agent Classes
const TimelineAgent = require('../functions/agent_orchestrator/agents/timelineAgent');
const LegalAgent = require('../functions/agent_orchestrator/agents/legalAgent');
const SQLAgent = require('../functions/agent_orchestrator/agents/sqlAgent');

// Mock Catalyst App Instance
const mockCatalystApp = {
    datastore: () => ({
        executeQueries: async () => []
    })
};

test('VAJRA Timeline Agent - Heuristic Chronology Extraction', (t) => {
    const agent = new TimelineAgent(mockCatalystApp);
    
    const statement = "On 04-07-2026 at 10:30 PM, the warehouse alarm went off. Rajesh Kumar saw a black truck driving away from Electronic City.";
    const events = agent.heuristicParse(statement);
    assert.strictEqual(events.length >= 1, true, "Should extract at least one event from statement");
    assert.strictEqual(events.some(e => e.evidence_source === "AI Text Extraction Service"), true, "Source metadata should match timeline agent identifier");
    assert.strictEqual(events.some(e => e.title.includes("On 04-07-2026")), true, "Title parsing should extract matching first words");
});

test('VAJRA Legal Agent - BNS Penal Code Mapping', (t) => {
    const agent = new LegalAgent(mockCatalystApp);
    
    const events = [
        { description: "Suspect broke lock and stole laptop from building." }
    ];
    
    const recommendations = agent.heuristicLegalLookup(events);
    
    assert.strictEqual(recommendations.length >= 1, true, "Should recommend BNS sections for theft/burglary description");
    assert.strictEqual(recommendations[0].bns_section, "Section 303", "Should map theft description to Section 303");
    assert.strictEqual(recommendations[0].confidence, 0.95, "Confidence rating should match expected mapping standard");
});

test('VAJRA SQL Agent - Injection Sanitization and Query Safe-building', (t) => {
    const agent = new SQLAgent(mockCatalystApp);
    
    // Test SQL Injection Sanitization
    const injectionQuery = "cases WHERE status = 'OPEN'; DROP TABLE cases; --";
    const sanitized = agent.sanitizeInput(injectionQuery);
    
    assert.strictEqual(sanitized.includes(';'), false, "Should strip semi-colon statements");
    assert.strictEqual(sanitized.includes('--'), false, "Should strip comment sequences");
    assert.strictEqual(sanitized.includes('DROP'), false, "Should strip drop commands");
    
    // Test Predefined Query Safe-building
    const caseQuery = "find cases with status open";
    const sql = agent.buildSQLQuery(caseQuery);
    
    assert.strictEqual(sql.includes('SELECT'), true, "Should compile SELECT statements");
    assert.strictEqual(sql.includes('cases'), true, "Should compile case database target table query");
});
