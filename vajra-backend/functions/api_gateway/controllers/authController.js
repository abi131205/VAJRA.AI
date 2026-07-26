const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'vajra-ai-super-secret-key-12345';

/**
 * @route POST /api/v1/auth/login
 * @desc Authenticates officers and returns token/context
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Missing email or password" });
    }

    try {
        // Mock Fallback for Datathon local prototyping and demo credential bypass
        if (email === "inspector.rajesh@karnataka.gov.in" && password === "VajraPass123") {
            const mockUser = {
                id: "999",
                name: "Rajesh Kumar",
                role: "INSPECTOR",
                station_id: "BLR_STN_04"
            };
            const token = jwt.sign(mockUser, JWT_SECRET, { expiresIn: '24h' });

            return res.status(200).json({
                message: "Authentication successful (Demo Fallback)",
                token: token,
                officer: mockUser
            });
        }

        const db = req.catalystAdmin ? req.catalystAdmin.datastore() : req.catalyst.datastore();
        
        // Find officer record directly in Employee table (avoiding complex joins for stability)
        const queryResult = await db.executeQueries(
            `SELECT ROWID, FirstName, password_hash, status, UnitID, RankID FROM Employee WHERE email = '${email}' LIMIT 1`
        );

        if (queryResult && queryResult.length > 0) {
            const employeeData = queryResult[0].Employee || queryResult[0];
            
            if (employeeData.status !== 'ACTIVE') {
                return res.status(403).json({ error: "Officer profile suspended" });
            }

            // Verify password using bcryptjs
            const isMatch = bcrypt.compareSync(password, employeeData.password_hash);
            if (!isMatch) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            // Map RankID to Role string for permissions mapping
            let role = 'INSPECTOR';
            const rankId = parseInt(employeeData.RankID, 10);
            if (rankId === 2) role = 'CONSTABLE';
            else if (rankId === 3) role = 'SUB_INSPECTOR';
            else if (rankId === 4) role = 'SUPERINTENDENT';

            // Sign a real JWT token
            const token = jwt.sign({
                id: employeeData.ROWID,
                name: employeeData.FirstName,
                role: role,
                station_id: employeeData.UnitID || 'BLR_STN_04'
            }, JWT_SECRET, { expiresIn: '24h' });

            return res.status(200).json({
                message: "Authentication successful",
                token: token,
                officer: {
                    id: employeeData.ROWID,
                    name: employeeData.FirstName,
                    role: role,
                    station_id: employeeData.UnitID || 'BLR_STN_04'
                }
            });
        }

        return res.status(401).json({ error: "Invalid credentials" });
    } catch (err) {
        console.error("Auth Controller error:", err);
        return res.status(500).json({ error: "Internal Server Error in authentication router" });
    }
});

/**
 * @route POST /api/v1/auth/register
 * @desc Registers a new officer in Employee table
 */
router.post('/register', async (req, res) => {
    const { name, email, password, kgid, rank_id } = req.body;

    if (!name || !email || !password || !kgid) {
        return res.status(400).json({ error: "Missing required registration fields" });
    }

    try {
        const db = req.catalystAdmin ? req.catalystAdmin.datastore() : req.catalyst.datastore();
        
        // 1. Check if email already exists (using Admin scope instance)
        const existingResult = await db.executeQueries(
            `SELECT ROWID FROM Employee WHERE email = '${email}' LIMIT 1`
        );
        if (existingResult && existingResult.length > 0) {
            return res.status(400).json({ error: "Officer email is already registered" });
        }

        // 2. Hash password with bcryptjs
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(password, salt);

        // 3. Insert new row
        const employeeId = Math.floor(100000 + Math.random() * 900000); // 6-digit EmployeeID
        const row = {
            EmployeeID:    employeeId,
            KGID:          kgid,
            FirstName:     name,
            email:         email,
            password_hash: passwordHash,
            RankID:        parseInt(rank_id, 10) || 1, // Default to Rank 1 (Inspector)
            UnitID:        999, // Default Station ID
            status:        'ACTIVE'
        };

        const insertResult = await db.table('Employee').insertRow(row);

        // 4. Commit audit entry (uses canonical `audit_log` table)
        try {
            const AuditService = require('../services/auditService');
            await AuditService.commitAuditEntry(req.catalystAdmin || req.catalyst, {
                actor_id:    email,
                case_id:     'N/A',
                action_type: 'OFFICER_REGISTRATION',
                payload:     { email, kgid, rank_id }
            });
        } catch (auditErr) {
            console.warn('[AuthController] Registration audit failed (non-blocking):', auditErr.message);
        }

        return res.status(201).json({
            message: "Officer registered successfully",
            officer: {
                id: insertResult.ROWID,
                name: name,
                email: email
            }
        });
    } catch (err) {
        console.error("Registration error:", err);
        const errMsg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
        return res.status(500).json({ error: `Registration error: ${errMsg}` });
    }
});

module.exports = router;
