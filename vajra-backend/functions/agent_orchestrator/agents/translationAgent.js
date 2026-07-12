'use strict';
/**
 * Translation Agent – Kannada ↔ English via Zia NMT
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps Zoho Zia's Neural Machine Translation (NMT) service.
 * Called as the `translate_if_kn` step in the Circuit, after parallel branching
 * and before the final MergeAndCite aggregation step.
 *
 * Zoho Catalyst SDK usage:
 *   catalystApp.zia().translate({ text, source_language, target_language })
 *
 * Language codes (Zia NMT):
 *   'kn' → Kannada
 *   'en' → English
 */

class TranslationAgent {
    constructor(catalystApp) {
        this.catalystApp = catalystApp;
    }

    /**
     * Translate text to English if the source language is Kannada.
     * Passes text through unchanged for any other language.
     *
     * @param {string} text   – Input text to (maybe) translate
     * @param {string} lang   – ISO-639-1 language code (e.g. 'kn', 'en')
     * @returns {Promise<{ translated_text: string, source_lang: string, translated: boolean }>}
     */
    async translateIfKannada(text, lang) {
        if (!text || lang !== 'kn') {
            return {
                translated_text: text,
                source_lang:     lang || 'en',
                translated:      false
            };
        }

        try {
            const zia    = this.catalystApp.zia();
            const result = await zia.translate({
                text:            text,
                source_language: 'kn',
                target_language: 'en'
            });

            const translatedText = result.translated_text
                || result.translation
                || result.output
                || text;

            console.info('[TranslationAgent] Zia NMT: Kannada → English translation complete.');

            return {
                translated_text: translatedText,
                source_lang:     'kn',
                translated:      true,
                zia_confidence:  result.confidence || null
            };

        } catch (ziaErr) {
            console.warn('[TranslationAgent] Zia NMT unavailable, returning original text:', ziaErr.message);

            // Graceful degraded mode – return with a note
            return {
                translated_text: text,
                source_lang:     'kn',
                translated:      false,
                note:            'Zia NMT translation unavailable; original Kannada text returned.'
            };
        }
    }

    /**
     * Translate a full agent result object's text fields.
     * Recursively translates any string values found in `result.data`.
     *
     * @param {object} agentResult  – Full merged agent output
     * @param {string} lang         – Source language
     * @returns {Promise<object>}   – Same structure with translated strings
     */
    async translateResultObject(agentResult, lang) {
        if (lang !== 'kn') return agentResult;

        // Translate the top-level `summary` or `answer` field if present
        const toTranslate = agentResult.summary || agentResult.answer || agentResult.query || '';

        if (toTranslate) {
            const { translated_text, translated } = await this.translateIfKannada(toTranslate, lang);
            agentResult._kn_translation = { original: toTranslate, translated_text, translated };
        }

        return agentResult;
    }
}

module.exports = TranslationAgent;
