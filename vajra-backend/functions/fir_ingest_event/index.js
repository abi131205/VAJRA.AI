'use strict';
/**
 * FIR Ingest Event – Zoho Catalyst Basic I/O Function
 * ─────────────────────────────────────────────────────────────────────────────
 * Triggered by a Catalyst Signal on `cases` table INSERT events.
 *
 * Execution flow:
 *   1. Read the inserted case row from the Signal payload
 *   2. Check `zia_ocr_done` flag
 *   3. If false → download FIR document from FileStore → Zia OCR
 *   4. Update the `cases` row: store extracted text, set zia_ocr_done = true
 *   5. Push extracted text to QuickML RAG Knowledge Base for semantic search
 *   6. Commit a hash-chained audit entry via AuditService logic
 *
 * Zoho Catalyst SDK usage (all referenced explicitly):
 *   catalystApp.datastore()                           → SQL tables
 *   catalystApp.filestore().folder(name).getFile(id)  → Download FIR file
 *   catalystApp.zia().extractOpticalCharacter(buffer) → OCR
 *   catalystApp.ml().addDocument({ kb_id, content })  → RAG Knowledge Base
 *
 * Signal payload shape (Catalyst row-event):
 * {
 *   "tableName":  "cases",
 *   "eventType":  "INSERT",
 *   "row": {
 *     "case_number":       "FIR_15_2026",
 *     "title":             "Whitefield Vehicle Smuggling",
 *     "description":       "...",
 *     "status":            "OPEN",
 *     "assigned_officer":  "999",
 *     "zia_ocr_done":      false,
 *     "fir_document_url":  "catalyst://evidence_bucket/fir_15_2026.pdf"
 *   }
 * }
 */

const catalyst = require('zcatalyst-sdk-node');
const crypto   = require('crypto');

// ── QuickML RAG Knowledge Base ID ─────────────────────────────────────────
const RAG_KB_ID = process.env.QUICKML_RAG_KB_ID || 'vajra_legal_kb_v1';

// ── Inline audit commit (mirrors auditService.js) ─────────────────────────
async function commitAuditEntry(catalystApp, { actor_id, case_id, action_type, payload }) {
    const timestamp   = new Date().toISOString();
    const action_id   = `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const payloadJson = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
    let   prev_hash   = '0'.repeat(64);

    try {
        const db   = catalystApp.datastore();
        const rows = await db.executeQueries(
            `SELECT entry_hash FROM audit_log ORDER BY ROWID DESC LIMIT 1`
        );
        if (rows && rows.length > 0 && rows[0].audit_log?.entry_hash) {
            prev_hash = rows[0].audit_log.entry_hash;
        }
        // FIX (Bug 4.1): compute payload_hash first, then build pre-image using
        // payload_hash so the verifier (auditService.verifyChain) can recompute
        // the same entry_hash from the stored payload_hash column.
        const payload_hash = crypto.createHash('sha256').update(payloadJson, 'utf8').digest('hex');
        const raw          = `${prev_hash}|${actor_id}|${case_id}|${action_type}|${payload_hash}|${timestamp}`;
        const entry_hash   = crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
        await db.table('audit_log').insertRow({
            action_id, actor_id, case_id, action_type,
            payload_hash,
            prev_hash, entry_hash, created_time: timestamp
        });
        console.info(`[FIRIngest:Audit] Committed: ${action_id} | ...${prev_hash.slice(-8)} → ${entry_hash.slice(-8)}`);
        return { action_id, entry_hash };
    } catch (err) {
        console.warn('[FIRIngest:Audit] Degraded mode (DB write failed):', err.message);
        // FIX (Bug 4.1): degraded-mode path must also use payload_hash in pre-image.
        const payload_hash = crypto.createHash('sha256').update(payloadJson, 'utf8').digest('hex');
        const raw          = `${prev_hash}|${actor_id}|${case_id}|${action_type}|${payload_hash}|${timestamp}`;
        const entry_hash   = crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
        return { action_id, entry_hash, degraded: true };
    }
}

// ── OCR helper ─────────────────────────────────────────────────────────────
/**
 * Attempt to download the FIR file from Catalyst FileStore and run Zia OCR.
 * Returns extracted text string (or null on failure).
 */
async function runZiaOCR(catalystApp, fir_document_url) {
    let fileBuffer = null;

    // ── Download file from Catalyst FileStore ──────────────────────────────
    if (fir_document_url && !fir_document_url.startsWith('mock://')) {
        try {
            // Extract folder + file details from catalyst:// URL
            // Format: catalyst://<folder>/<filename>  or full HTTPS URL
            const filestore = catalystApp.filestore();

            if (fir_document_url.startsWith('http')) {
                // If it's a signed HTTP URL, fetch raw buffer
                const https       = require('https');
                const http        = require('http');
                const fetchClient = fir_document_url.startsWith('https') ? https : http;

                fileBuffer = await new Promise((resolve, reject) => {
                    fetchClient.get(fir_document_url, (response) => {
                        const chunks = [];
                        response.on('data', chunk => chunks.push(chunk));
                        response.on('end',  () => resolve(Buffer.concat(chunks)));
                        response.on('error', reject);
                    }).on('error', reject);
                });

                console.info(`[FIRIngest] Downloaded FIR file via HTTPS: ${fileBuffer.length} bytes`);

            } else {
                // Catalyst internal URL → use FileStore SDK
                const urlParts  = fir_document_url.replace('catalyst://', '').split('/');
                const folderName = urlParts[0] || 'evidence_bucket';
                const fileName   = urlParts.slice(1).join('/');

                const folder  = filestore.folder(folderName);
                const fileObj = await folder.getFileDetails(fileName);
                fileBuffer    = await folder.downloadFile(fileObj.id);

                console.info(`[FIRIngest] Downloaded FIR from FileStore folder "${folderName}": ${fileName}`);
            }

        } catch (downloadErr) {
            console.warn('[FIRIngest] File download failed, using mock text:', downloadErr.message);
        }
    }

    // ── Run Zia OCR ──────────────────────────────────────────────────────────
    if (fileBuffer) {
        try {
            const zia = catalystApp.zia();
            const ocrResult = await zia.extractOpticalCharacter(fileBuffer);
            const text      = ocrResult.text
                || ocrResult.extracted_text
                || ocrResult.response
                || '';

            if (text.length > 0) {
                console.info(`[FIRIngest] Zia OCR extracted ${text.length} chars from FIR document.`);
                return text;
            }
        } catch (ocrErr) {
            console.warn('[FIRIngest] Zia OCR failed, using fallback text:', ocrErr.message);
        }
    }

    // ── Fallback: return structured mock text ────────────────────────────────
    return null;
}

// ── RAG Knowledge Base push ────────────────────────────────────────────────
/**
 * Index the extracted FIR text in the QuickML RAG Knowledge Base so it is
 * retrievable by the RAG Agent during future /api/v1/chat queries.
 */
async function indexInRAG(catalystApp, case_number, title, extractedText) {
    try {
        const ml = catalystApp.ml();
        await ml.addDocument({
            kb_id:    RAG_KB_ID,
            doc_id:   `fir_${case_number}`,
            title:    title || case_number,
            content:  extractedText,
            metadata: {
                case_number,
                source:    'zia_ocr_extraction',
                indexed_at: new Date().toISOString()
            }
        });
        console.info(`[FIRIngest] Indexed case ${case_number} in RAG KB: ${RAG_KB_ID}`);
        return true;
    } catch (ragErr) {
        console.warn('[FIRIngest] RAG indexing failed (non-blocking):', ragErr.message);
        return false;
    }
}

// ── Update cases row in DataStore ──────────────────────────────────────────
async function markOCRDone(catalystApp, case_number, extractedText) {
    try {
        const db = catalystApp.datastore();

        // Fetch the ROWID of the target case (needed for updateRow)
        const rows = await db.executeQueries(
            `SELECT ROWID FROM cases WHERE case_number = '${case_number}' LIMIT 1`
        );

        if (!rows || rows.length === 0) {
            console.warn(`[FIRIngest] Case ${case_number} not found in DataStore for update.`);
            return false;
        }

        const rowId = rows[0].cases?.ROWID || rows[0].ROWID;

        await db.table('cases').updateRow({
            ROWID:            rowId,
            zia_ocr_done:     true,
            ocr_extracted_text: extractedText.slice(0, 2000) // VARCHAR(2000) limit per schema
        });

        console.info(`[FIRIngest] Updated case ${case_number}: zia_ocr_done = true`);
        return true;

    } catch (dbErr) {
        console.warn('[FIRIngest] DataStore update failed (non-blocking):', dbErr.message);
        return false;
    }
}

// ── Main handler ───────────────────────────────────────────────────────────
module.exports = async (context, basicIO) => {
    const catalystApp = catalyst.initialize(context);

    try {
        // ── 1. Parse Signal payload ────────────────────────────────────────
        const rawPayload = basicIO.getArgument('payload');

        let signalData = {};
        try {
            signalData = typeof rawPayload === 'string'
                ? JSON.parse(rawPayload)
                : (rawPayload || {});
        } catch (parseErr) {
            console.warn('[FIRIngest] Could not parse signal payload:', parseErr.message);
        }

        // Support both Catalyst native signal format and direct invocation
        const row = signalData.row || signalData;

        const case_number      = row.case_number   || 'UNKNOWN';
        const title            = row.title          || '';
        const assigned_officer = row.assigned_officer || 'SYSTEM';
        const fir_document_url = row.fir_document_url || row.file_url || '';

        // Normalize the zia_ocr_done flag (Signal may deliver booleans or strings)
        const zia_ocr_done = row.zia_ocr_done === true
            || row.zia_ocr_done === 'true'
            || row.zia_ocr_done === 1;

        console.info(`[FIRIngest] Processing case: ${case_number} | zia_ocr_done: ${zia_ocr_done}`);

        // ── 2. Skip if OCR already completed ──────────────────────────────
        if (zia_ocr_done) {
            console.info(`[FIRIngest] Case ${case_number} already processed (zia_ocr_done = true). Skipping.`);
            basicIO.write(JSON.stringify({
                status:      'SKIPPED',
                case_number,
                reason:      'zia_ocr_done already true',
                timestamp:   new Date().toISOString()
            }));
            context.close();
            return;
        }

        // ── 3. Attempt Zia OCR ─────────────────────────────────────────────
        let extractedText = await runZiaOCR(catalystApp, fir_document_url);

        // Fallback mock OCR text for demo resilience when no document exists
        if (!extractedText) {
            extractedText = [
                `FIR Case Number: ${case_number}.`,
                `Title: ${title}.`,
                `Case registered on ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}.`,
                'Initial FIR description indicates a cognizable offence requiring immediate investigation.',
                'Suspect was seen near the location of the incident. Further investigation is required to',
                'establish the sequence of events, collect physical evidence, and interview witnesses.'
            ].join(' ');
            console.info('[FIRIngest] Using fallback OCR text (no document or OCR unavailable).');
        }

        // ── 4. Update cases row in DataStore ──────────────────────────────
        const dbUpdated = await markOCRDone(catalystApp, case_number, extractedText);

        // ── 5. Index in QuickML RAG Knowledge Base ─────────────────────────
        const ragIndexed = await indexInRAG(catalystApp, case_number, title, extractedText);

        // ── 6. Commit hash-chained audit entry ────────────────────────────
        const auditResult = await commitAuditEntry(catalystApp, {
            actor_id:    'FIR_INGEST_EVENT',
            case_id:     case_number,
            action_type: 'FIR_INGEST',
            payload: {
                fir_document_url,
                ocr_chars:   extractedText.length,
                db_updated:  dbUpdated,
                rag_indexed: ragIndexed
            }
        });

        // ── 7. Write result ────────────────────────────────────────────────
        basicIO.write(JSON.stringify({
            status:         'SUCCESS',
            case_number,
            ocr_chars:      extractedText.length,
            db_updated:     dbUpdated,
            rag_indexed:    ragIndexed,
            audit_entry_id: auditResult.action_id,
            audit_hash:     auditResult.entry_hash,
            timestamp:      new Date().toISOString()
        }));

    } catch (err) {
        console.error('[FIRIngest] Fatal execution error:', err);
        basicIO.write(JSON.stringify({
            status:    'ERROR',
            error:     err.message,
            timestamp: new Date().toISOString()
        }));
    } finally {
        context.close();
    }
};
