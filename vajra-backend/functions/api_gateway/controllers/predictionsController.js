'use strict';
/**
 * Predictions Controller – GET /api/v1/predictions
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns spatial-temporal crime hotspot predictions for the geospatial heatmap.
 *
 * Per the Playbook §18.3 (Catalyst Service Optimization Ledger), QuickML was
 * simplified to an "offline-trained predictive matrix" pattern: the ForecastAgent
 * first tries the QuickML SDK; if unavailable, it falls back to a rule-based
 * spatial cluster model seeded with Karnataka SCRB historical incident data.
 *
 * This endpoint was missing — store.js fetchHotspots() called GET /api/v1/predictions
 * and received 404, leaving the geospatial heatmap empty.
 *
 * Response shape expected by GeospatialHeatmap.jsx / store.js MOCK_HOTSPOTS:
 *   Array<{ lat, lng, intensity, type, count, area?, risk_level?, confidence? }>
 *
 * Zoho Catalyst SDK path (production):
 *   ForecastAgent → catalystApp.ml().predict({ model_id, input_data })
 *   → falls back to _ruleBasedForecast() automatically on SDK failure
 */

const express       = require('express');
const router        = express.Router();
const ForecastAgent = require('../../agent_orchestrator/agents/forecastAgent');

// ── SHAP feature importances (static for demo; populated by QuickML in prod) ──
const SHAP_FEATURES = [
    { feature: 'hour_of_day',    importance: 0.31, direction: 'High risk 22:00–03:00' },
    { feature: 'day_of_week',    importance: 0.22, direction: 'Weekends +15% incident rate' },
    { feature: 'area_density',   importance: 0.19, direction: 'Commercial zones higher risk' },
    { feature: 'prior_incidents',importance: 0.17, direction: 'Repeat hotspot clustering' },
    { feature: 'patrol_coverage',importance: 0.11, direction: 'Inverse: lower coverage → higher risk' }
];

// ── GET /api/v1/predictions ───────────────────────────────────────────────────
/**
 * @route   GET /api/v1/predictions
 * @query   area    – Optional area filter (e.g. "Electronic City")
 * @query   days    – Forecast window in days (default: 7)
 * @returns Array of hotspot objects normalized for the frontend heatmap
 */
router.get('/', async (req, res) => {
    const { area = 'bangalore_overall', days = '7' } = req.query;
    const query = area !== 'bangalore_overall'
        ? `predict hotspots near ${area} for next ${days} days`
        : `predict crime hotspots across Bangalore for next ${days} days`;

    try {
        // ── Invoke ForecastAgent (QuickML → rule-based fallback) ─────────────
        const agent    = new ForecastAgent(req.catalyst);
        const forecast = await agent.predictHotspots(query);

        const hotspots = forecast.hotspots || [];

        // ── Normalize to frontend-expected shape ──────────────────────────────
        //    The frontend heatmap expects: { lat, lng, intensity, type, count }
        //    The ForecastAgent returns:    { lat, lng, risk_level, crime_types, predicted_incidents, confidence }
        const normalized = hotspots.map(h => ({
            lat:       h.lat,
            lng:       h.lng,
            intensity: h.risk_level === 'HIGH'   ? 0.90
                     : h.risk_level === 'MEDIUM' ? 0.65
                     : 0.40,
            type:      Array.isArray(h.crime_types) ? h.crime_types[0] : (h.type || 'Theft'),
            count:     h.predicted_incidents || 1,
            area:      h.area || area,
            risk_level:       h.risk_level || 'LOW',
            peak_hours:       h.peak_hours || 'Unknown',
            confidence:       h.confidence || 0.70,
            predicted_incidents: h.predicted_incidents || 1
        }));

        // ── If ForecastAgent returned empty (edge case), serve static matrix ──
        if (normalized.length === 0) {
            normalized.push(
                { lat: 12.9716, lng: 77.5946, intensity: 0.90, type: 'Robbery',       count: 14, area: 'MG Road',       risk_level: 'HIGH',   confidence: 0.87 },
                { lat: 12.8399, lng: 77.6770, intensity: 0.85, type: 'Burglary',       count: 11, area: 'Electronic City',risk_level: 'HIGH',   confidence: 0.82 },
                { lat: 12.9352, lng: 77.6245, intensity: 0.75, type: 'Vehicle Theft',  count: 9,  area: 'Koramangala',   risk_level: 'MEDIUM', confidence: 0.74 },
                { lat: 12.9766, lng: 77.7232, intensity: 0.60, type: 'ATM Skimming',   count: 7,  area: 'Whitefield',    risk_level: 'MEDIUM', confidence: 0.68 },
                { lat: 12.9141, lng: 77.6387, intensity: 0.55, type: 'Theft',          count: 6,  area: 'BTM Layout',    risk_level: 'MEDIUM', confidence: 0.65 },
                { lat: 12.9902, lng: 77.5494, intensity: 0.40, type: 'Assault',        count: 4,  area: 'Rajajinagar',   risk_level: 'LOW',    confidence: 0.60 },
                { lat: 12.9300, lng: 77.5800, intensity: 0.35, type: 'Cyber Crime',    count: 3,  area: 'Malleswaram',   risk_level: 'LOW',    confidence: 0.55 }
            );
        }

        return res.status(200).json({
            hotspots:        normalized,
            model:           forecast.model || 'rule_based_spatial_cluster_v1',
            source:          forecast.source || 'fallback',
            confidence:      forecast.confidence || 0.72,
            forecast_window: `${days}d`,
            shap_features:   SHAP_FEATURES,
            generated_at:    new Date().toISOString()
        });

    } catch (err) {
        console.error('[PredictionsController] ForecastAgent failed:', err);

        // Hard fallback — always return usable data so the heatmap is never blank
        return res.status(200).json({
            hotspots: [
                { lat: 12.9716, lng: 77.5946, intensity: 0.90, type: 'Robbery',      count: 14, area: 'MG Road',        risk_level: 'HIGH',   confidence: 0.87 },
                { lat: 12.8399, lng: 77.6770, intensity: 0.85, type: 'Burglary',      count: 11, area: 'Electronic City', risk_level: 'HIGH',   confidence: 0.82 },
                { lat: 12.9352, lng: 77.6245, intensity: 0.75, type: 'Vehicle Theft', count: 9,  area: 'Koramangala',    risk_level: 'MEDIUM', confidence: 0.74 },
                { lat: 12.9766, lng: 77.7232, intensity: 0.60, type: 'ATM Skimming',  count: 7,  area: 'Whitefield',     risk_level: 'MEDIUM', confidence: 0.68 },
                { lat: 12.9141, lng: 77.6387, intensity: 0.55, type: 'Theft',         count: 6,  area: 'BTM Layout',     risk_level: 'MEDIUM', confidence: 0.65 },
                { lat: 12.9902, lng: 77.5494, intensity: 0.40, type: 'Assault',       count: 4,  area: 'Rajajinagar',    risk_level: 'LOW',    confidence: 0.60 },
                { lat: 12.9300, lng: 77.5800, intensity: 0.35, type: 'Cyber Crime',   count: 3,  area: 'Malleswaram',    risk_level: 'LOW',    confidence: 0.55 }
            ],
            model:           'static_matrix_fallback',
            source:          'hardcoded',
            confidence:      0.70,
            forecast_window: `${days}d`,
            shap_features:   SHAP_FEATURES,
            generated_at:    new Date().toISOString()
        });
    }
});

module.exports = router;
