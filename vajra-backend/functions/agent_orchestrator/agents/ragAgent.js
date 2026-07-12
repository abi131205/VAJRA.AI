'use strict';
/**
 * RAG Agent – Legal / Historical Knowledge Retrieval (rag_query)
 * ─────────────────────────────────────────────────────────────────────────────
 * Queries the QuickML RAG Knowledge Base for legal precedents, BNS manual
 * excerpts, and historical case summaries most relevant to the user's query.
 *
 * Zoho Catalyst SDK usage:
 *   catalystApp.ml().query({ kb_id, query_text, top_k })
 *
 * Falls back to keyword-driven heuristic lookup over `cases` table.
 */

class RAGAgent {
    constructor(catalystApp) {
        this.catalystApp = catalystApp;

        // QuickML RAG Knowledge Base ID (configured in Catalyst Console)
        this.KB_ID   = process.env.QUICKML_RAG_KB_ID || 'vajra_legal_kb_v1';
        this.TOP_K   = 5;
    }

    /**
     * Retrieve contextual knowledge for a natural language query.
     * @param {string} query
     * @returns {Promise<{snippets: Array, source: string}>}
     */
    async retrieve(query) {
        // ── 1. Try QuickML RAG endpoint ──────────────────────────────────────
        try {
            const ml     = this.catalystApp.ml();
            const result = await ml.query({
                kb_id:      this.KB_ID,
                query_text: query,
                top_k:      this.TOP_K
            });

            const parsed  = typeof result === 'string' ? JSON.parse(result) : result;
            const items   = parsed.results || parsed.snippets || parsed || [];

            if (items.length > 0) {
                return {
                    snippets: items,
                    source:   'quickml_rag_kb'
                };
            }
        } catch (mlErr) {
            console.warn('[RAGAgent] QuickML RAG unavailable, using heuristic fallback:', mlErr.message);
        }

        // ── 2. Try historical case keyword search via DataStore ──────────────
        try {
            const db    = this.catalystApp.datastore();
            const kw    = this._extractKeyword(query);
            const rows  = await db.executeQueries(
                `SELECT case_number, title, description, status FROM cases
                 WHERE title LIKE '%${kw}%' OR description LIKE '%${kw}%' LIMIT 5`
            );

            if (rows && rows.length > 0) {
                const snippets = rows.map(r => {
                    const c = r.cases || r;
                    return {
                        type:    'historical_case',
                        title:   c.title,
                        excerpt: (c.description || '').slice(0, 200),
                        ref:     c.case_number,
                        status:  c.status
                    };
                });
                return { snippets, source: 'datastore_keyword_search' };
            }
        } catch (dbErr) {
            console.warn('[RAGAgent] DataStore keyword search failed:', dbErr.message);
        }

        // ── 3. Static legal index fallback ───────────────────────────────────
        return this._staticLegalFallback(query);
    }

    _extractKeyword(query) {
        // Strip common stop-words and return the most content-bearing word
        const stopWords = new Set(['what', 'is', 'the', 'a', 'an', 'are', 'was', 'were', 'in', 'on', 'for', 'of', 'to', 'and', 'or', 'find', 'show', 'list', 'get']);
        const words     = query.toLowerCase().split(/\s+/);
        const kw        = words.find(w => w.length > 3 && !stopWords.has(w));
        // Strip any remaining injection chars
        return (kw || 'case').replace(/['";\-\\]/g, '');
    }

    _staticLegalFallback(query) {
        const q = query.toLowerCase();

        const legalSnippets = [
            {
                type:    'bns_section',
                title:   'BNS Section 303 – Theft',
                excerpt: 'Whoever commits theft shall be punished with imprisonment up to 3 years, or with fine, or both.',
                ref:     'BNS 303',
                confidence: 0.90
            },
            {
                type:    'bns_section',
                title:   'BNS Section 329 – House-Breaking',
                excerpt: 'Lurking house-trespass or house-breaking by night is punishable with imprisonment up to 5 years.',
                ref:     'BNS 329',
                confidence: 0.88
            },
            {
                type:    'bns_section',
                title:   'BSA Section 63 – Electronic Records',
                excerpt: 'A computer-generated document is admissible as evidence if the computer was regularly used and functioning properly.',
                ref:     'BSA 63',
                confidence: 0.92
            },
            {
                type:    'procedure',
                title:   'BNSS Section 173 – FIR Registration',
                excerpt: 'Every FIR must be registered immediately upon knowledge of a cognizable offence and forwarded to the magistrate.',
                ref:     'BNSS 173',
                confidence: 0.95
            }
        ];

        // Filter relevant snippets by keyword
        let matched = legalSnippets.filter(s =>
            q.includes('theft') || q.includes('burglary') || q.includes('stolen') ||
            q.includes('electronic') || q.includes('fir') || q.includes('legal') || q.includes('section')
        );

        if (matched.length === 0) matched = legalSnippets.slice(0, 2);

        return { snippets: matched, source: 'static_legal_index' };
    }
}

module.exports = RAGAgent;
