const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Local Mock Catalyst SDK Middleware Bypass
app.use((req, res, next) => {
    req.catalyst = {
        datastore: () => ({
            table: (name) => ({
                insertRow: async (row) => row
            }),
            executeQueries: async (query) => []
        }),
        filestore: () => ({
            folder: () => ({
                uploadFile: async (file) => ({ url: "mock://vajra-filestore/local-upload.bin" })
            })
        }),
        zia: () => ({
            extractOpticalCharacter: async () => ({ text: "On 04-07-2026 at 10:30 PM, the warehouse alarm went off." })
        }),
        function: (name) => ({
            execute: async (payload) => JSON.stringify({
                status: "SUCCESS",
                data: {
                    events: [
                        { event_id: "evt_ocr_1", timestamp: "2026-07-04T22:30:00.000Z", title: "Breach Detected", description: "On 04-07-2026 at 10:30 PM, the warehouse alarm went off.", evidence_source: "Zia OCR Extraction", confidence: 0.95 }
                    ]
                }
            })
        })
    };
    next();
});

// Import Controllers
const authController = require('./controllers/authController');
const caseController = require('./controllers/caseController');
const evidenceController = require('./controllers/evidenceController');

app.use('/api/v1/auth', authController);
app.use('/api/v1/cases', caseController);
app.use('/api/v1/evidence', evidenceController);

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: "healthy", environment: "local-dev" });
});

const PORT = 8080;
app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`VAJRA.AI Local Dev API Server running successfully.`);
    console.log(`Address: http://localhost:${PORT}`);
    console.log(`===================================================`);
});
