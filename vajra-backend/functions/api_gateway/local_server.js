'use strict';
/**
 * VAJRA.AI – Local Development API Server
 * ─────────────────────────────────────────────────────────────────────────────
 * Mirrors the Catalyst Function entry point (index.js) but replaces the real
 * Catalyst SDK with a full mock so all controllers work identically in local dev.
 *
 * Fixes applied:
 *   • All 5 controllers + predictionsController mounted (was only 3)
 *   • smartbrowz(), circuit(), cache(), ml() stubs added (were missing)
 *   • Port 8080 matches Vite proxy target
 */

const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const crypto  = require('crypto');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// ── Full Mock Catalyst SDK ────────────────────────────────────────────────────
app.use((req, res, next) => {
    req.catalyst = {

        // DataStore mock
        datastore: () => ({
            table: (name) => ({
                insertRow: async (row) => ({ ...row, ROWID: Date.now().toString() }),
                updateRow: async (row) => ({ ...row })
            }),
            executeQueries: async (query) => {
                // Return plausible mock rows for common queries
                if (query && query.includes('audit_log')) {
                    return [{ audit_log: { entry_hash: '0'.repeat(64), payload_hash: '0'.repeat(64) } }];
                }
                return [];
            }
        }),

        // FileStore mock
        filestore: () => ({
            folder: (name) => ({
                uploadFile: async (file) => ({
                    url: `mock://vajra-filestore/${name}/${file.name || 'upload.bin'}`,
                    file_url: `mock://vajra-filestore/${name}/${file.name || 'upload.bin'}`
                }),
                getFileDetails: async (filename) => ({ id: `mock_id_${Date.now()}`, name: filename }),
                downloadFile: async (id) => Buffer.from('MOCK_FILE_CONTENT')
            })
        }),

        // Zia OCR mock
        zia: () => ({
            extractOpticalCharacter: async () => ({
                text: 'On 04-07-2026 at 10:30 PM, the warehouse alarm went off. ' +
                      'At 10:45 PM, a witness saw a black container truck driving away from Electronic City. ' +
                      'At 02:00 AM on 05-07-2026, Constable confirmed physical door lock damage on locker 4B.'
            })
        }),

        // SmartBrowz mock (was missing – caused chatController / exportController to throw)
        smartbrowz: () => ({
            convertToPdf: async ({ html }) => {
                const mockPdf = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n' +
                                `%% VAJRA.AI Mock Brief — ${new Date().toISOString()}\n` +
                                `%% HTML length: ${(html || '').length} chars\n`;
                return Buffer.from(mockPdf, 'utf8');
            }
        }),

        // Catalyst Circuits mock (was missing – caused chatController to throw)
        circuit: (name) => ({
            execute: async (input) => {
                const intent = input.intent || 'rag_query';
                return JSON.stringify({
                    status: 'SUCCESS',
                    intent,
                    primary_data: {
                        snippets: [
                            { type: 'bns_section', title: 'BNS Section 303 – Theft', ref: 'BNS 303', confidence: 0.90,
                              excerpt: 'Whoever commits theft shall be punished with imprisonment up to 3 years.' }
                        ]
                    },
                    citations: [{ source: 'BNS Legal Index', type: 'rag' }],
                    confidence: 0.88,
                    session_id: input.session_id,
                    timestamp: new Date().toISOString()
                });
            }
        }),

        // NoSQL Cache mock (was missing)
        cache: () => ({
            segment: (name) => ({
                get: async (key) => null,
                put: async (key, value, ttl) => true,
                delete: async (key) => true
            })
        }),

        // QuickML / ML mock
        ml: () => ({
            predict: async ({ model_id, input_data }) => JSON.stringify({
                predictions: [
                    { area: 'Electronic City', lat: 12.8399, lng: 77.6770, risk_level: 'HIGH',   confidence: 0.87, predicted_incidents: 4 },
                    { area: 'Whitefield',       lat: 12.9698, lng: 77.7499, risk_level: 'MEDIUM', confidence: 0.74, predicted_incidents: 2 },
                    { area: 'Koramangala',      lat: 12.9352, lng: 77.6245, risk_level: 'LOW',    confidence: 0.65, predicted_incidents: 1 }
                ],
                confidence: 0.80
            }),
            query: async ({ kb_id, query_text, top_k }) => JSON.stringify({ results: [] }),
            addDocument: async ({ kb_id, doc_id, content }) => ({ success: true, doc_id })
        }),

        // Function invocation mock
        function: (name) => ({
            execute: async (payload) => JSON.stringify({
                status: 'SUCCESS',
                task: payload.task_type,
                data: {
                    events: [
                        { event_id: 'evt_ocr_1', timestamp: '2026-07-04T22:30:00.000Z',
                          title: 'Breach Detected', description: 'Warehouse alarm triggered at 10:30 PM.',
                          evidence_source: 'Zia OCR Extraction', confidence: 0.95 }
                    ]
                },
                timestamp: new Date().toISOString()
            })
        })
    };
    next();
});

// ── Import Controllers ────────────────────────────────────────────────────────
const authController        = require('./controllers/authController');
const caseController        = require('./controllers/caseController');
const evidenceController    = require('./controllers/evidenceController');
const chatController        = require('./controllers/chatController');
const exportController      = require('./controllers/exportController');
const predictionsController = require('./controllers/predictionsController');

// ── API Routing ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth',        authController);
app.use('/api/v1/cases',       caseController);
app.use('/api/v1/evidence',    evidenceController);
app.use('/api/v1/chat',        chatController);
app.use('/api/v1/export',      exportController);
app.use('/api/v1/predictions', predictionsController);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'healthy', environment: 'local-dev', timestamp: new Date().toISOString() });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('[LocalServer] Unhandled error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = 8080;
app.listen(PORT, () => {
    console.log(`\n╔═══════════════════════════════════════════════════╗`);
    console.log(`║  VAJRA.AI Local Dev API Server — port ${PORT}       ║`);
    console.log(`║  http://localhost:${PORT}/api/health                ║`);
    console.log(`║  Mock Catalyst SDK: DataStore, Zia, Circuit, ML    ║`);
    console.log(`╚═══════════════════════════════════════════════════╝\n`);
});
