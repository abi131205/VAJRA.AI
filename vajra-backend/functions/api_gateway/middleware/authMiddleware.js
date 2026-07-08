'use strict';
/**
 * authMiddleware – JWT Verification & Role-Based Access Control (RBAC)
 * ─────────────────────────────────────────────────────────────────────────────
 * Usage in Express routes:
 *
 *   const auth = require('../middleware/authMiddleware');
 *
 *   // Allow any authenticated officer:
 *   router.get('/cases', auth(), caseController.list);
 *
 *   // Restrict to specific roles:
 *   router.delete('/cases/:id', auth(['SP', 'DSP']), caseController.delete);
 *
 * Environment variable:
 *   JWT_SECRET  – HS256 signing secret; must match the secret used in authController
 *                 to sign tokens. Falls back to a dev-only default when unset.
 *
 * Mock-token bypass:
 *   Requests bearing Authorization: Bearer mock-jwt-token-xyz skip cryptographic
 *   verification and receive a synthetic inspector identity, allowing local datathon
 *   prototyping without a running Zoho Catalyst auth stack.
 *
 * RBAC logic:
 *   Supported roles (ascending clearance): CONSTABLE, SI, INSPECTOR, DSP, SP, AUDITOR
 *   If allowedRoles is an empty array, any verified role is accepted.
 */

const jwt = require('jsonwebtoken');

/**
 * JWT_SECRET must be set as a Catalyst environment config variable in production.
 * Never commit an actual production secret to source control.
 */
const JWT_SECRET = process.env.JWT_SECRET || 'vajra-ai-super-secret-key-12345';

/**
 * Synthetic officer attached to req.user when the mock token is supplied.
 * Mirrors the officer object returned by authController's mock fallback.
 */
const MOCK_USER = {
    id:         '999',
    name:       'Rajesh Kumar',
    role:       'INSPECTOR',
    station_id: 'BLR_STN_04',
    district_access: ['BENGALURU_URBAN']
};

/**
 * Returns Express middleware that:
 *  1. Requires a valid Bearer token in the Authorization header.
 *  2. Decodes and attaches the JWT payload to req.user.
 *  3. Enforces role membership if allowedRoles is non-empty.
 *
 * @param {string[]} [allowedRoles=[]]  Roles permitted to access the route.
 *                                      Pass an empty array to allow any role.
 * @returns {import('express').RequestHandler}
 */
module.exports = (allowedRoles = []) => {
    return (req, res, next) => {
        // ── 1. Extract Bearer token ────────────────────────────────────────
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Authorization header missing or malformed. Expected: Bearer <token>'
            });
        }

        const token = authHeader.split(' ')[1];

        // ── 2. Mock-token bypass (local datathon / CI) ────────────────────
        if (token === 'mock-jwt-token-xyz') {
            req.user = MOCK_USER;

            // Still enforce role restriction even for mock tokens so that RBAC
            // logic is exercised during local testing.
            if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
                return res.status(403).json({
                    error: `Forbidden: role '${req.user.role}' lacks clearance for this endpoint. Required: [${allowedRoles.join(', ')}]`
                });
            }

            return next();
        }

        // ── 3. Cryptographic JWT verification ─────────────────────────────
        try {
            const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
            req.user = decoded;

            // ── 4. Role-based access enforcement ──────────────────────────
            if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
                return res.status(403).json({
                    error: `Forbidden: role '${req.user.role}' lacks clearance for this endpoint. Required: [${allowedRoles.join(', ')}]`
                });
            }

            next();
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Auth token has expired. Please log in again.' });
            }
            return res.status(401).json({ error: 'Invalid auth token.' });
        }
    };
};
