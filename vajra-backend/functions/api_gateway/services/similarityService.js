'use strict';

/**
 * Similarity Service - Computes Modus Operandi (MO) text similarity
 * using word-frequency cosine similarity algorithms to compare cases.
 */
class SimilarityService {
    constructor() {
        this.stopWords = new Set([
            'and', 'the', 'was', 'were', 'for', 'with', 'that', 'this', 'have', 'has', 'had',
            'are', 'but', 'not', 'from', 'out', 'into', 'over', 'both', 'some', 'such', 'then',
            'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'each', 'few',
            'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same', 'so', 'than', 'too', 'very'
        ]);
    }

    /**
     * Tokenizes a text block, removes punctuation, stop-words, and short terms.
     * @param {string} text 
     * @returns {string[]} List of lowercase keywords
     */
    tokenize(text) {
        if (!text || typeof text !== 'string') return [];
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length >= 3 && !this.stopWords.has(word));
    }

    /**
     * Builds a term-frequency vector map for a list of tokens.
     * @param {string[]} tokens 
     * @returns {Map<string, number>} Term frequency map
     */
    getVector(tokens) {
        const vector = new Map();
        for (const token of tokens) {
            vector.set(token, (vector.get(token) || 0) + 1);
        }
        return vector;
    }

    /**
     * Calculates the Cosine Similarity between two term-frequency maps.
     * Formula: Similarity = (A . B) / (||A|| * ||B||)
     * @param {Map<string, number>} vecA 
     * @param {Map<string, number>} vecB 
     * @returns {number} Value between 0.0 and 1.0
     */
    calculateCosineSimilarity(vecA, vecB) {
        if (vecA.size === 0 || vecB.size === 0) return 0.0;

        let dotProduct = 0;
        let magnitudeA = 0;
        let magnitudeB = 0;

        // Compute dot product and magnitude of A
        for (const [term, freqA] of vecA.entries()) {
            magnitudeA += freqA * freqA;
            if (vecB.has(term)) {
                dotProduct += freqA * vecB.get(term);
            }
        }

        // Compute magnitude of B
        for (const freqB of vecB.values()) {
            magnitudeB += freqB * freqB;
        }

        const magA = Math.sqrt(magnitudeA);
        const magB = Math.sqrt(magnitudeB);

        if (magA === 0 || magB === 0) return 0.0;
        return dotProduct / (magA * magB);
    }

    /**
     * Compares case descriptions and returns the similarity score.
     * @param {string} descA 
     * @param {string} descB 
     * @returns {number} Score between 0.0 and 1.0
     */
    compare(descA, descB) {
        const tokensA = this.tokenize(descA);
        const tokensB = this.tokenize(descB);

        const vecA = this.getVector(tokensA);
        const vecB = this.getVector(tokensB);

        return this.calculateCosineSimilarity(vecA, vecB);
    }

    /**
     * Finds and ranks other historical cases based on MO description similarity.
     * @param {object} catalystApp 
     * @param {string} targetCaseNumber 
     * @returns {Promise<Array>} List of similar case matches ordered by score DESC
     */
    async findSimilarCases(catalystApp, targetCaseNumber) {
        try {
            const db = catalystApp.datastore();
            
            // 1. Fetch all cases
            const allCasesResult = await db.executeQueries(
                `SELECT CaseNo, CrimeNo, BriefFacts, title FROM CaseMaster`
            );

            if (!allCasesResult || allCasesResult.length === 0) {
                return [];
            }

            const cases = allCasesResult.map(c => c.CaseMaster || c);
            const targetCase = cases.find(c => c.CaseNo === targetCaseNumber || c.CrimeNo === targetCaseNumber);

            if (!targetCase) {
                console.warn(`[SimilarityService] Target case ${targetCaseNumber} not found.`);
                return [];
            }

            const targetDesc = targetCase.BriefFacts || '';
            const targetId = targetCase.CaseNo;

            // 2. Compute similarity for all other cases
            const matches = [];
            for (const c of cases) {
                if (c.CaseNo === targetId) continue; // skip comparing to itself

                const score = this.compare(targetDesc, c.BriefFacts || '');
                
                // Extract overlapping keywords for front-end transparency
                const targetTokens = this.tokenize(targetDesc);
                const compareTokens = this.tokenize(c.BriefFacts || '');
                const overlap = targetTokens.filter(t => compareTokens.includes(t));
                const uniqueOverlap = [...new Set(overlap)].slice(0, 4);

                matches.push({
                    case_number: c.CaseNo || c.CrimeNo,
                    title: c.title || 'Untitled Case',
                    similarity_score: parseFloat(score.toFixed(2)),
                    overlapping_keys: uniqueOverlap,
                    summary: c.BriefFacts ? c.BriefFacts.slice(0, 100) + '...' : ''
                });
            }

            // 3. Sort by score descending and return
            return matches.sort((a, b) => b.similarity_score - a.similarity_score);

        } catch (err) {
            console.error('[SimilarityService] Failed to find similar cases:', err);
            return [];
        }
    }
}

module.exports = SimilarityService;
