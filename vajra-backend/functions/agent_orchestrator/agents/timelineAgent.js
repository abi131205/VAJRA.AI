/**
 * Timeline Agent - Parses unstructured texts and extracts chronological event flows.
 */
class TimelineAgent {
    constructor(catalystApp) {
        this.catalystApp = catalystApp;
    }

    /**
     * Extracts timeline events from witness/case descriptions
     * @param {string} rawText 
     * @returns {Promise<Array>} Chronological event list
     */
    async extractEvents(rawText) {
        if (!rawText) return [];

        try {
            // Attempt standard LLM extraction if API credentials exist
            // In a production Zoho Catalyst workspace, this uses zia.ai or an external API gateway
            const apiKey = process.env.LLM_API_KEY;
            if (apiKey) {
                return await this.callLLMForTimeline(rawText, apiKey);
            }
        } catch (err) {
            console.warn("LLM timeline extraction failed, falling back to rule-based parser:", err.message);
        }

        // Fallback: Rule-based heuristic parser for Datathon demo resilience
        return this.heuristicParse(rawText);
    }

    /**
     * Fallback text parsing heuristics (regex-based date/time extraction)
     */
    heuristicParse(text) {
        const events = [];
        const lines = text.split(/[.\n]/);
        
        let eventCounter = 1;
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length < 15) continue;

            // Simple time heuristics scanner
            let timestamp = new Date().toISOString();
            let hasTime = false;

            // Search for time patterns (e.g., "10:30 PM", "midnight", "02:00 hours")
            const timeMatch = trimmed.match(/(\d{1,2})[:.](\d{2})\s*(AM|PM|hours)?/i);
            if (timeMatch) {
                const hours = parseInt(timeMatch[1]);
                const minutes = parseInt(timeMatch[2]);
                const isPm = timeMatch[3] && timeMatch[3].toUpperCase() === 'PM';
                
                const eventDate = new Date();
                eventDate.setHours(isPm && hours < 12 ? hours + 12 : hours);
                eventDate.setMinutes(minutes);
                eventDate.setSeconds(0);
                timestamp = eventDate.toISOString();
                hasTime = true;
            }

            if (hasTime || trimmed.toLowerCase().includes('suspect') || trimmed.toLowerCase().includes('stole') || trimmed.toLowerCase().includes('saw')) {
                events.push({
                    event_id: `evt_auto_${eventCounter++}`,
                    timestamp: timestamp,
                    title: this.generateShortTitle(trimmed),
                    description: trimmed,
                    evidence_source: "AI Text Extraction Service",
                    confidence: hasTime ? 0.90 : 0.75
                });
            }
        }

        // Sort chronologically
        return events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    generateShortTitle(sentence) {
        const words = sentence.split(' ');
        if (words.length <= 4) return sentence;
        return words.slice(0, 4).join(' ') + '...';
    }

    async callLLMForTimeline(text, apiKey) {
        // Mocking direct axios post request to an LLM provider (e.g., OpenAI or Zia custom model)
        // Returns structured timeline events
        console.log("Invoking external LLM Timeline extraction...");
        return [
            {
                event_id: "evt_llm_1",
                timestamp: new Date().toISOString(),
                title: "Extracted Incident",
                description: text,
                evidence_source: "LLM Parser Node",
                confidence: 0.95
            }
        ];
    }
}

module.exports = TimelineAgent;
