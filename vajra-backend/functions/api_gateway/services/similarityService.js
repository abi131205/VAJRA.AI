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
     * Computes a Trust/Reliability score for a match — distinct from similarity_score.
     * Similarity measures HOW alike two MOs are; trust measures HOW MUCH the
     * investigator should rely on that number given data quality.
     *
     * Weighted blend of:
     *   50% - raw similarity score (the signal itself)
     *   30% - overlap density (overlap tokens / union of unique tokens — penalizes
     *          matches that only share 1-2 common words out of huge descriptions)
     *   20% - data completeness (penalizes very short / sparse MO descriptions,
     *          which produce noisy, unreliable cosine scores)
     *
     * @param {string} descA 
     * @param {string} descB 
     * @param {number} similarityScore 
     * @returns {{trust_score: number, reliability_label: string}}
     */
    calculateTrustScore(descA, descB, similarityScore) {
        const tokensA = this.tokenize(descA);
        const tokensB = this.tokenize(descB);

        if (tokensA.length === 0 || tokensB.length === 0) {
            return { trust_score: 0.0, reliability_label: 'LOW' };
        }

        const setA = new Set(tokensA);
        const setB = new Set(tokensB);
        const overlapCount = [...setA].filter(t => setB.has(t)).length;
        const unionCount = new Set([...setA, ...setB]).size;
        const overlapDensity = unionCount > 0 ? overlapCount / unionCount : 0;

        // Completeness: cases with richer MO descriptions yield more trustworthy
        // similarity scores. Normalized against a 25-token "reasonably detailed" baseline.
        const COMPLETENESS_BASELINE = 25;
        const completenessA = Math.min(tokensA.length / COMPLETENESS_BASELINE, 1);
        const completenessB = Math.min(tokensB.length / COMPLETENESS_BASELINE, 1);
        const completeness = (completenessA + completenessB) / 2;

        const trustScore =
            (0.5 * similarityScore) +
            (0.3 * overlapDensity) +
            (0.2 * completeness);

        const clamped = Math.max(0, Math.min(1, trustScore));
        const rounded = parseFloat(clamped.toFixed(2));

        // Label is derived from the ROUNDED value so the displayed number and
        // label never disagree (e.g. avoid showing "0.50 / LOW" to an investigator).
        let reliability_label = 'LOW';
        if (rounded >= 0.75) reliability_label = 'HIGH';
        else if (rounded >= 0.5) reliability_label = 'MEDIUM';

        return {
            trust_score: rounded,
            reliability_label
        };
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

                const compareDesc = c.BriefFacts || '';
                const score = this.compare(targetDesc, compareDesc);
                const { trust_score, reliability_label } = this.calculateTrustScore(targetDesc, compareDesc, score);
                
                // Extract overlapping keywords for front-end transparency
                const targetTokens = this.tokenize(targetDesc);
                const compareTokens = this.tokenize(compareDesc);
                const overlap = targetTokens.filter(t => compareTokens.includes(t));
                const uniqueOverlap = [...new Set(overlap)].slice(0, 4);

                matches.push({
                    case_number: c.CaseNo || c.CrimeNo,
                    title: c.title || 'Untitled Case',
                    similarity_score: parseFloat(score.toFixed(2)),
                    trust_score,
                    reliability_label,
                    overlapping_keys: uniqueOverlap,
                    summary: compareDesc ? compareDesc.slice(0, 100) + '...' : ''
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
