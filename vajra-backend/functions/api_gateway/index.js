const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const catalyst = require('zcatalyst-sdk-node');

const app = express();

// Standard Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Catalyst SDK Initialization Middleware
app.use((req, res, next) => {
    try {
        const catalystApp = catalyst.initialize(req);
        req.catalyst = catalystApp;
        next();
    } catch (err) {
        console.error("Failed to initialize Catalyst Node SDK:", err);
        res.status(500).json({ error: "Catalyst SDK initialization failure" });
    }
});

// Import Controllers
const authController = require('./controllers/authController');
const caseController = require('./controllers/caseController');
const evidenceController = require('./controllers/evidenceController');

// API Routing Table
app.use('/api/v1/auth', authController);
app.use('/api/v1/cases', caseController);
app.use('/api/v1/evidence', evidenceController);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled API Error:", err);
    res.status(500).json({
        error: "Internal Server Error",
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

module.exports = app;
