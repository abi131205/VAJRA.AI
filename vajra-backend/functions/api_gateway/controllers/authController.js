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
        const db = req.catalyst.datastore();
        
        // Find officer record in KSP Employee table joined with Rank by email
        const queryResult = await db.executeQueries(
            `SELECT Employee.ROWID, Employee.FirstName, Employee.password_hash, Employee.status, Employee.UnitID, Rank.RankName FROM Employee LEFT JOIN Rank ON Employee.RankID = Rank.RankID WHERE Employee.email = '${email}' LIMIT 1`
        );

        if (queryResult && queryResult.length > 0) {
            // In join queries, Catalyst SDK returns columns nested under table names
            const employeeData = queryResult[0].Employee || queryResult[0];
            const rankData = queryResult[0].Rank || {};
            
            if (employeeData.status !== 'ACTIVE') {
                return res.status(403).json({ error: "Officer profile suspended" });
            }

            // Verify password using bcryptjs
            const isMatch = bcrypt.compareSync(password, employeeData.password_hash);
            if (!isMatch) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            const role = (rankData.RankName || 'INSPECTOR').toUpperCase();

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

        // Mock Fallback for Datathon local prototyping if DB is empty
        if (email === "inspector.rajesh@karnataka.gov.in" && password === "VajraPass123") {
            const mockUser = {
                id: "999",
                name: "Rajesh Kumar",
                role: "INSPECTOR",
                station_id: "BLR_STN_04"
            };
            const token = jwt.sign(mockUser, JWT_SECRET, { expiresIn: '24h' });

            return res.status(200).json({
                message: "Authentication successful (Mock Fallback)",
                token: token,
                officer: mockUser
            });
        }

        return res.status(401).json({ error: "Invalid credentials" });
    } catch (err) {
        console.error("Auth Controller error:", err);
        return res.status(500).json({ error: "Internal Server Error in authentication router" });
    }
});

module.exports = router;
