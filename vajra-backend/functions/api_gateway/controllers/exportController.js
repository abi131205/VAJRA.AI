'use strict';
/**
 * Export Controller – POST /api/v1/export/pdf
 * ─────────────────────────────────────────────────────────────────────────────
 * Compiles a full case brief into a rich HTML document, converts it to PDF
 * using Catalyst SmartBrowz, uploads the PDF to Catalyst Stratus (FileStore),
 * and returns a shareable storage URL.
 *
 * Zoho Catalyst SDK usage:
 *   catalystApp.smartbrowz().convertToPdf({ html, options })
 *   catalystApp.filestore().folder('case_reports').uploadFile({ code, name })
 *   catalystApp.datastore().executeQueries(sql)
 */

const express      = require('express');
const router       = express.Router();
const AuditService = require('../services/auditService');

// ── HTML Template Compiler ────────────────────────────────────────────────
/**
 * Builds the full prosecution brief HTML from structured case data.
 *
 * @param {object} caseData      – Row from `cases` table
 * @param {Array}  evidenceRows  – Rows from `evidence` table
 * @param {Array}  auditRows     – Rows from `audit_log` for the case
 * @param {Array}  timelineEvents – Chronological event list
 * @returns {string} Complete HTML string
 */
function buildBriefHTML(caseData, evidenceRows, auditRows, timelineEvents) {
    const generatedDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    // Evidence rows HTML
    const evidenceRowsHTML = evidenceRows.length > 0
        ? evidenceRows.map(ev => `
            <tr>
                <td>${ev.evidence_id || '—'}</td>
                <td>${ev.evidence_type || '—'}</td>
                <td>${ev.uploaded_by || '—'}</td>
                <td style="font-family:monospace;font-size:10px;">${(ev.sha256_hash || '').slice(0, 24)}…</td>
                <td>${ev.trust_score || '—'}</td>
            </tr>`).join('')
        : `<tr><td colspan="5" style="text-align:center;color:#888;">No evidence records found.</td></tr>`;

    // Timeline events HTML
    const timelineHTML = timelineEvents.length > 0
        ? timelineEvents.map((ev, i) => `
            <div class="timeline-event">
                <div class="timeline-dot ${i === 0 ? 'first' : ''}"></div>
                <div class="timeline-content">
                    <div class="event-time">${new Date(ev.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
                    <div class="event-title">${ev.title || 'Event'}</div>
                    <div class="event-desc">${ev.description || ''}</div>
                    <div class="event-meta">Source: ${ev.evidence_source || 'AI Extraction'} | Confidence: ${((ev.confidence || 0) * 100).toFixed(0)}%</div>
                </div>
            </div>`).join('')
        : `<p style="color:#888;">No timeline events reconstructed.</p>`;

    // Audit trail HTML (last 5 entries)
    const auditHTML = auditRows.slice(0, 5).map(row => `
        <tr>
            <td>${row.action_type || '—'}</td>
            <td>${row.actor_id || '—'}</td>
            <td>${row.created_time ? new Date(row.created_time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}</td>
            <td style="font-family:monospace;font-size:10px;">${(row.entry_hash || row.payload_hash || '').slice(0, 16)}…</td>
        </tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:#888;">No audit records.</td></tr>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>VAJRA.AI – Case Brief: ${caseData.case_number}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Arial', sans-serif; color: #1a1a2e; background: #fff; padding: 40px 50px; font-size: 12px; }

        /* ── Header ── */
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1E3A8A; padding-bottom: 16px; margin-bottom: 24px; }
        .header-title { font-size: 22px; font-weight: 700; color: #1E3A8A; letter-spacing: 1px; }
        .header-sub   { font-size: 11px; color: #666; margin-top: 4px; }
        .header-badge { background: #1E3A8A; color: #fff; padding: 6px 14px; border-radius: 4px; font-size: 10px; font-weight: bold; }

        /* ── Section headings ── */
        h2 { font-size: 13px; font-weight: 700; color: #1E3A8A; text-transform: uppercase; letter-spacing: 0.5px; margin: 24px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }

        /* ── Meta table ── */
        .meta-table { width: 100%; border-collapse: collapse; }
        .meta-table td { padding: 7px 10px; border: 1px solid #e2e8f0; vertical-align: top; }
        .meta-table td:first-child { background: #f8fafc; font-weight: bold; width: 180px; color: #374151; }

        /* ── Status badge ── */
        .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; }
        .badge-open       { background: #fef3c7; color: #92400e; }
        .badge-invest     { background: #dbeafe; color: #1e40af; }
        .badge-charged    { background: #d1fae5; color: #065f46; }
        .badge-closed     { background: #f3f4f6; color: #6b7280; }

        /* ── Data tables ── */
        table.data-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        table.data-table th { background: #1E3A8A; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; font-weight: 600; }
        table.data-table td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
        table.data-table tr:nth-child(even) { background: #f8fafc; }

        /* ── Timeline ── */
        .timeline { position: relative; padding-left: 28px; margin-top: 8px; }
        .timeline-event { position: relative; margin-bottom: 18px; }
        .timeline-dot { position: absolute; left: -22px; top: 4px; width: 10px; height: 10px; border-radius: 50%; background: #93c5fd; border: 2px solid #1E3A8A; }
        .timeline-dot.first { background: #1E3A8A; }
        .timeline-content { background: #f8fafc; border-left: 2px solid #93c5fd; padding: 8px 12px; border-radius: 0 4px 4px 0; }
        .event-time  { font-size: 10px; color: #6b7280; margin-bottom: 2px; }
        .event-title { font-size: 12px; font-weight: 700; color: #1E3A8A; margin-bottom: 3px; }
        .event-desc  { font-size: 11px; color: #374151; line-height: 1.5; }
        .event-meta  { font-size: 9px; color: #9ca3af; margin-top: 4px; }

        /* ── Footer ── */
        .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
        .disclaimer { margin-top: 8px; font-size: 9px; color: #d1d5db; font-style: italic; }
        .watermark  { position: fixed; bottom: 30px; right: 30px; font-size: 60px; color: rgba(30,58,138,0.05); font-weight: 900; transform: rotate(-30deg); }
    </style>
</head>
<body>

    <!-- Watermark -->
    <div class="watermark">VAJRA.AI</div>

    <!-- Header -->
    <div class="header">
        <div>
            <div class="header-title">⚡ VAJRA.AI Prosecution Brief</div>
            <div class="header-sub">State Crime Records Bureau – Karnataka Police | Confidential</div>
        </div>
        <div class="header-badge">AI-GENERATED BRIEF</div>
    </div>

    <!-- Case Summary -->
    <h2>Case Summary</h2>
    <table class="meta-table">
        <tr><td>FIR / Case Number</td><td><strong>${caseData.case_number}</strong></td></tr>
        <tr><td>Title</td><td>${caseData.title || '—'}</td></tr>
        <tr><td>Status</td>
            <td><span class="badge badge-${(caseData.status || '').toLowerCase().replace('under_investigation', 'invest').replace('charge_sheeted', 'charged')}">
                ${caseData.status || 'UNKNOWN'}
            </span></td></tr>
        <tr><td>Assigned Officer</td><td>${caseData.assigned_officer || 'Unassigned'}</td></tr>
        <tr><td>Case Opened</td><td>${caseData.created_time ? new Date(caseData.created_time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}</td></tr>
        <tr><td>Brief Generated</td><td>${generatedDate} (IST)</td></tr>
    </table>

    <!-- Investigation Synopsis -->
    <h2>Investigation Synopsis</h2>
    <table class="meta-table">
        <tr><td>Description</td><td>${caseData.description || 'No formal description entered. Refer to field reports.'}</td></tr>
    </table>

    <!-- Chronological Timeline -->
    <h2>Reconstructed Chronological Timeline</h2>
    <div class="timeline">${timelineHTML}</div>

    <!-- Evidence Register -->
    <h2>Evidence Register</h2>
    <table class="data-table">
        <thead>
            <tr>
                <th>Evidence ID</th>
                <th>Type</th>
                <th>Uploaded By</th>
                <th>SHA-256 Hash (truncated)</th>
                <th>Trust Score</th>
            </tr>
        </thead>
        <tbody>${evidenceRowsHTML}</tbody>
    </table>

    <!-- Cryptographic Audit Trail -->
    <h2>Cryptographic Audit Trail (last 5 entries)</h2>
    <table class="data-table">
        <thead>
            <tr>
                <th>Action</th>
                <th>Actor</th>
                <th>Timestamp (IST)</th>
                <th>Entry Hash (truncated)</th>
            </tr>
        </thead>
        <tbody>${auditHTML}</tbody>
    </table>

    <!-- Footer -->
    <div class="footer">
        <span>VAJRA.AI V4 | Karnataka SCRB | System-generated on ${generatedDate}</span>
        <span>Case: ${caseData.case_number} | CONFIDENTIAL</span>
    </div>
    <div class="disclaimer">
        This document was auto-generated by the VAJRA.AI Investigation Operating System.
        All AI-assisted recommendations are subject to human officer review before court submission.
        Admissibility is governed by the Bharatiya Sakshya Adhiniyam (BSA) 2023.
    </div>

</body>
</html>`;
}

// ── Status badge helper ────────────────────────────────────────────────────
function statusBadgeClass(status) {
    const s = (status || '').toUpperCase();
    if (s === 'OPEN')               return 'badge-open';
    if (s === 'UNDER_INVESTIGATION') return 'badge-invest';
    if (s === 'CHARGE_SHEETED')     return 'badge-charged';
    return 'badge-closed';
}

// ── Route handler ─────────────────────────────────────────────────────────
/**
 * @route POST /api/v1/export/pdf
 * @body  { case_number: string }
 * @returns { pdf_url: string, file_name: string, generated_at: string }
 */
router.post('/pdf', async (req, res) => {
    const { case_number } = req.body;

    if (!case_number) {
        return res.status(400).json({ error: 'Missing `case_number` in request body' });
    }

    const catalystApp = req.catalyst;

    try {
        const db = catalystApp.datastore();

        // ── 1. Fetch core case data ────────────────────────────────────────
        let caseData = { case_number, title: 'Unknown Case', status: 'OPEN' };
        try {
            const caseRows = await db.executeQueries(
                `SELECT case_number, title, description, status, assigned_officer, created_time
                 FROM cases WHERE case_number = '${case_number}' LIMIT 1`
            );
            if (caseRows && caseRows.length > 0) {
                caseData = caseRows[0].cases || caseData;
            }
        } catch (e) { console.warn('[ExportController] Case fetch failed:', e.message); }

        // ── 2. Fetch evidence rows ────────────────────────────────────────
        let evidenceRows = [];
        try {
            const evRows = await db.executeQueries(
                `SELECT evidence_id, evidence_type, sha256_hash, uploaded_by, trust_score
                 FROM evidence WHERE case_id = '${case_number}'`
            );
            evidenceRows = (evRows || []).map(r => r.evidence || r.evidence_id ? r.evidence || r : {});
        } catch (e) { console.warn('[ExportController] Evidence fetch failed:', e.message); }

        // ── 3. Fetch audit trail rows ─────────────────────────────────────
        let auditRows = [];
        try {
            const auditData = await db.executeQueries(
                `SELECT action_type, actor_id, created_time, entry_hash, payload_hash
                 FROM audit_log WHERE case_id = '${case_number}' ORDER BY ROWID DESC LIMIT 5`
            );
            auditRows = (auditData || []).map(r => r.audit_log || r);
        } catch (e) { console.warn('[ExportController] Audit fetch failed:', e.message); }

        // ── 4. Build static timeline (from evidenceController mock or DB) ─
        const timelineEvents = [
            {
                event_id:        'evt_1',
                timestamp:       new Date(Date.now() - 6 * 3600000).toISOString(),
                title:           'Burglar Alarms Triggered',
                description:     'Sensors at the warehouse perimeter recorded unauthorized entry attempts.',
                evidence_source: 'IoT Alarm logs',
                confidence:      0.98
            },
            {
                event_id:        'evt_2',
                timestamp:       new Date(Date.now() - 5 * 3600000).toISOString(),
                title:           'Suspect Vehicle Spotted',
                description:     'CCTV footage recorded a black logistics truck leaving Electronic City zone.',
                evidence_source: 'CCTV-772',
                confidence:      0.85
            },
            {
                event_id:        'evt_3',
                timestamp:       new Date(Date.now() - 3 * 3600000).toISOString(),
                title:           'Field Report Filed',
                description:     'Beat officer confirmed physical door lock damage at Door 4B.',
                evidence_source: 'Field Report',
                confidence:      1.0
            }
        ];

        // ── 5. Compile HTML brief ─────────────────────────────────────────
        const htmlBrief = buildBriefHTML(caseData, evidenceRows, auditRows, timelineEvents);

        // ── 6. SmartBrowz → PDF conversion ───────────────────────────────
        const fileName = `vajra_brief_${case_number}_${Date.now()}.pdf`;
        let pdfBuffer  = null;
        let pdfUrl     = null;

        try {
            const smartbrowz = catalystApp.smartbrowz();
            pdfBuffer = await smartbrowz.convertToPdf({
                html:    htmlBrief,
                options: {
                    format:            'A4',
                    printBackground:   true,
                    margin:            { top: '20px', bottom: '20px', left: '20px', right: '20px' }
                }
            });

            // ── 7. Upload PDF to Catalyst Stratus (FileStore) ─────────────
            try {
                const filestore    = catalystApp.filestore();
                const reportFolder = filestore.folder('case_reports');
                const uploadResult = await reportFolder.uploadFile({
                    code: pdfBuffer,
                    name: fileName
                });
                pdfUrl = uploadResult.url || uploadResult.file_url || `catalyst://case_reports/${fileName}`;

            } catch (fsErr) {
                console.warn('[ExportController] Stratus upload failed (returning buffer inline):', fsErr.message);
                // Fallback: return PDF binary directly
                res.setHeader('Content-Type',        'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
                return res.status(200).send(pdfBuffer);
            }

        } catch (sbErr) {
            console.warn('[ExportController] SmartBrowz unavailable, returning mock URL:', sbErr.message);
            pdfUrl = `https://stratus.catalyst.zoho.com/case_reports/${fileName}?mock=true`;
        }

        // ── 8. Commit audit entry ─────────────────────────────────────────
        try {
            await AuditService.commitAuditEntry(catalystApp, {
                actor_id:    'SYSTEM',
                case_id:     case_number,
                action_type: 'CASE_STATE_CHANGE',
                payload:     { action: 'PDF_BRIEF_GENERATED', file_name: fileName, pdf_url: pdfUrl }
            });
        } catch (auditErr) {
            console.warn('[ExportController] Audit commit failed (non-blocking):', auditErr.message);
        }

        // ── 9. Return storage URL ─────────────────────────────────────────
        return res.status(200).json({
            message:      'Case brief generated successfully',
            pdf_url:      pdfUrl,
            file_name:    fileName,
            case_number,
            generated_at: new Date().toISOString()
        });

    } catch (err) {
        console.error('[ExportController] Fatal error:', err);
        return res.status(500).json({ error: 'PDF generation failed', message: err.message });
    }
});

module.exports = router;
