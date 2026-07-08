const express = require('express');
const router = express.Router();

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
        
        // Find officer record in Data Store by email address (login identifier)
        const queryResult = await db.executeQueries(
            `SELECT ROWID, name, role, station_id, status FROM officers WHERE email = '${email}' LIMIT 1`
        );

        if (queryResult && queryResult.length > 0) {
            const officer = queryResult[0].officers;
            
            if (officer.status !== 'ACTIVE') {
                return res.status(403).json({ error: "Officer profile suspended" });
            }

            return res.status(200).json({
                message: "Authentication successful",
                token: "mock-jwt-token-xyz",
                officer: {
                    id: officer.ROWID,
                    name: officer.name,
                    role: officer.role,
                    station_id: officer.station_id
                }
            });
        }

        // Mock Fallback for Datathon local prototyping if DB is empty
        if (email === "inspector.rajesh@karnataka.gov.in" && password === "VajraPass123") {
            return res.status(200).json({
                message: "Authentication successful (Mock Fallback)",
                token: "mock-jwt-token-xyz",
                officer: {
                    id: "999",
                    name: "Rajesh Kumar",
                    role: "INSPECTOR",
                    station_id: "BLR_STN_04"
                }
            });
        }

        return res.status(401).json({ error: "Invalid credentials" });
    } catch (err) {
        console.error("Auth Controller error:", err);
        return res.status(500).json({ error: "Internal Server Error in authentication router" });
    }
});

module.exports = router;
