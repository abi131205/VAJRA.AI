'use strict';
/**
 * AuditService – Hash-Chain Ledger for VAJRA.AI
 * ─────────────────────────────────────────────────────────────────────────────
 * Every audit entry is cryptographically chained to its predecessor:
 *
 *   payload_hash = SHA-256( payloadJson )
 *   entry_hash   = SHA-256( prev_hash | actor_id | case_id | action_type | payload_hash | timestamp )
 *
 * Chain verification: replay every row's entry_hash from its stored fields.
 * Modifying any past row invalidates all subsequent hashes (blockchain-style).
 *
 * FIX (2026-07-05): Separated payload_hash from entry_hash so verifyChain()
 * can independently recompute and validate both values using only stored columns.
 *
 * Zoho Catalyst SDK usage:
 *   catalystApp.datastore()            → Catalyst Data Store handle
 *   db.executeQueries(sql)             → Execute raw SELECT
 *   db.table('audit_log').insertRow()  → Append a new row
 */

const crypto = require('crypto');

class AuditService {

    /**
     * Commit a new entry to the audit_log hash chain.
     *
     * Schema columns used:
     *   payload_hash  = SHA-256(payloadJson)          ← searchable hash of payload content
     *   entry_hash    = SHA-256(prev|actor|case|action|payload_hash|ts) ← chain link
     *   prev_hash     = entry_hash of preceding row   ← chain pointer
     *
     * @param {object} catalystApp
     * @param {object} entry
     * @param {string} entry.actor_id
     * @param {string} entry.case_id
     * @param {string} entry.action_type
     * @param {string|object} entry.payload
     * @returns {Promise<{action_id, entry_hash, prev_hash}>}
     */
    static async commitAuditEntry(catalystApp, { actor_id, case_id, action_type, payload }) {
        const timestamp   = new Date().toISOString();
        const action_id   = `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const payloadJson = typeof payload === 'string' ? payload : JSON.stringify(payload || {});

        // ── payload_hash: SHA-256 of the raw payload JSON (content fingerprint)
        const payload_hash = crypto.createHash('sha256').update(payloadJson, 'utf8').digest('hex');

        let prev_hash = '0000000000000000000000000000000000000000000000000000000000000000'; // genesis

        try {
            const db = catalystApp.datastore();

            // ── 1. Fetch the most recent entry_hash (head of the chain) ──────
            const rows = await db.executeQueries(
                `SELECT entry_hash FROM audit_log ORDER BY ROWID DESC LIMIT 1`
            );
            if (rows && rows.length > 0 && rows[0].audit_log && rows[0].audit_log.entry_hash) {
                prev_hash = rows[0].audit_log.entry_hash;
            }

            // ── 2. Compute the new chain entry_hash ───────────────────────────
            //    Pre-image: prev_hash | actor_id | case_id | action_type | payload_hash | timestamp
            const raw        = `${prev_hash}|${actor_id}|${case_id}|${action_type}|${payload_hash}|${timestamp}`;
            const entry_hash = crypto.createHash('sha256').update(raw, 'utf8').digest('hex');

            // ── 3. Insert the new chained row ─────────────────────────────────
            await db.table('audit_log').insertRow({
                action_id,
                actor_id,
                case_id,
                action_type,
                payload_hash,   // SHA-256 of payloadJson  (content fingerprint)
                prev_hash,      // entry_hash of preceding row
                entry_hash,     // SHA-256 of full pre-image (chain link)
                created_time: timestamp
            });

            console.info(`[AuditService] Committed: ${action_id} | chain: ...${prev_hash.slice(-8)} → ${entry_hash.slice(-8)}`);
            return { action_id, entry_hash, prev_hash };

        } catch (err) {
            // Degraded mode: compute hash locally, never block the calling workflow
            console.error('[AuditService] DB write failed, operating in degraded mode:', err.message);

            const raw        = `${prev_hash}|${actor_id}|${case_id}|${action_type}|${payload_hash}|${timestamp}`;
            const entry_hash = crypto.createHash('sha256').update(raw, 'utf8').digest('hex');

            return { action_id, entry_hash, prev_hash, degraded: true };
        }
    }

    /**
     * Verify the integrity of the audit_log hash chain by replaying each row.
     *
     * For each row, recomputes:
     *   expected_entry_hash = SHA-256( prev_hash | actor_id | case_id | action_type | payload_hash | created_time )
     * and checks it matches the stored entry_hash.
     *
     * Returns the first broken link, or { intact: true } if the chain is valid.
     *
     * @param {object} catalystApp
     * @param {number} [limit=1000]
     * @returns {Promise<{intact: boolean, broken_at?: string, verified: number}>}
     */
    static async verifyChain(catalystApp, limit = 1000) {
        try {
            const db   = catalystApp.datastore();
            const rows = await db.executeQueries(
                `SELECT action_id, actor_id, case_id, action_type, payload_hash, prev_hash, entry_hash, created_time
                 FROM audit_log ORDER BY ROWID ASC LIMIT ${limit}`
            );

            // Genesis: first row's prev_hash must be all-zeros
            let expectedPrev = '0000000000000000000000000000000000000000000000000000000000000000';

            for (let i = 0; i < rows.length; i++) {
                const r = rows[i].audit_log || rows[i];

                // ── Check chain pointer ───────────────────────────────────────
                if (r.prev_hash !== expectedPrev) {
                    return { intact: false, broken_at: r.action_id, verified: i, reason: 'prev_hash_mismatch' };
                }

                // ── Recompute entry_hash from stored columns ──────────────────
                //    Must exactly mirror commitAuditEntry() pre-image:
                //    prev_hash | actor_id | case_id | action_type | payload_hash | created_time
                const raw        = `${r.prev_hash}|${r.actor_id}|${r.case_id}|${r.action_type}|${r.payload_hash}|${r.created_time}`;
                const recomputed = crypto.createHash('sha256').update(raw, 'utf8').digest('hex');

                if (recomputed !== r.entry_hash) {
                    return { intact: false, broken_at: r.action_id, verified: i, reason: 'entry_hash_mismatch' };
                }

                expectedPrev = r.entry_hash;
            }

            return { intact: true, verified: rows.length };

        } catch (err) {
            console.error('[AuditService] Chain verification failed:', err.message);
            return { intact: false, error: err.message, verified: 0 };
        }
    }
}

module.exports = AuditService;
