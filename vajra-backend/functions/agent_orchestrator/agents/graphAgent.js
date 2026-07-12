'use strict';
/**
 * Graph Agent – entity network queries for intent: graph_query
 * ─────────────────────────────────────────────────────────────────────────
 * Queries the Catalyst NoSQL `entity_graph_cache` collection to resolve
 * multi-hop entity relationships (suspects ↔ phones ↔ vehicles ↔ cases).
 *
 * Falls back to the SQL-backed NetworkService when NoSQL is unavailable.
 */

class GraphAgent {
    constructor(catalystApp) {
        this.catalystApp = catalystApp;
    }

    /**
     * Resolve the entity graph for a given query / case number.
     * @param {string} queryOrCaseNumber
     * @returns {Promise<{nodes: Array, edges: Array, source: string}>}
     */
    async resolveGraph(queryOrCaseNumber) {
        try {
            const nosql      = this.catalystApp.cache();
            const segment    = nosql.segment('entity_graph_cache');

            // Try to pull a cached graph document for this case
            const cacheKey   = `graph:${queryOrCaseNumber}`;
            const cached     = await segment.get(cacheKey);

            if (cached) {
                const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
                return { ...parsed, source: 'nosql_entity_graph_cache' };
            }
        } catch (nosqlErr) {
            console.warn('[GraphAgent] NoSQL cache unavailable, falling back to SQL network:', nosqlErr.message);
        }

        // Fallback: SQL-backed NetworkService
        try {
            const NetworkService = require('../../api_gateway/services/networkService');
            const netService     = new NetworkService(this.catalystApp);
            const graph          = await netService.getCaseNetwork(queryOrCaseNumber);
            return { ...graph, source: 'sql_network_service' };
        } catch (sqlErr) {
            console.warn('[GraphAgent] SQL network also unavailable, returning mock graph:', sqlErr.message);
        }

        return this._mockGraph(queryOrCaseNumber);
    }

    _mockGraph(caseNumber) {
        return {
            nodes: [
                { id: 'suspect_001',      label: 'Rajesh Kumar (Alias: Raj)', type: 'SUSPECT' },
                { id: 'phone_9876543210', label: 'SIM +91-98765-43210',       type: 'PHONE' },
                { id: 'vehicle_MH12',     label: 'Black Truck MH-12-AB-3456', type: 'VEHICLE' },
                { id: caseNumber,         label: caseNumber,                  type: 'CASE' },
                { id: 'officer_999',      label: 'Inspector Rajesh Kumar',    type: 'OFFICER' }
            ],
            edges: [
                { source: 'suspect_001',      target: caseNumber,         label: 'ACCUSED_IN',  confidence: 0.95 },
                { source: 'suspect_001',      target: 'phone_9876543210', label: 'OWNS',        confidence: 1.0  },
                { source: 'phone_9876543210', target: caseNumber,         label: 'PINGED_NEAR', confidence: 0.88 },
                { source: 'suspect_001',      target: 'vehicle_MH12',     label: 'OPERATED',    confidence: 0.82 },
                { source: 'officer_999',      target: caseNumber,         label: 'ASSIGNED_IO', confidence: 1.0  }
            ],
            source: 'mock_graph'
        };
    }
}

module.exports = GraphAgent;
