-- VAJRA.AI Data Store Relational Database Schema
-- Optimized for Zoho Catalyst SQL dialect

-- Table: officers
CREATE TABLE officers (
    ROWID BIGINT,
    officer_id VARCHAR(64) UNIQUE,
    name VARCHAR(128),
    role VARCHAR(32), -- CONSTABLE, SI, INSPECTOR, DSP, SP, AUDITOR
    station_id VARCHAR(64),
    status VARCHAR(16) -- ACTIVE, SUSPENDED
);

-- Table: cases
CREATE TABLE cases (
    ROWID BIGINT,
    case_number VARCHAR(64) UNIQUE,         -- FIR Number
    title VARCHAR(256),
    description VARCHAR(2000),
    status VARCHAR(32),                     -- OPEN, UNDER_INVESTIGATION, CHARGE_SHEETED, CLOSED
    assigned_officer VARCHAR(64),
    created_time DATETIME,
    -- FIR Ingest Pipeline additions:
    zia_ocr_done BOOLEAN DEFAULT FALSE,     -- Set to TRUE after fir_ingest_event processes this row
    fir_document_url VARCHAR(512),          -- catalyst:// or HTTPS URL to the raw FIR document
    ocr_extracted_text VARCHAR(2000)        -- OCR text extracted by Zia; fed into QuickML RAG KB
);

-- Table: evidence
CREATE TABLE evidence (
    ROWID BIGINT,
    evidence_id VARCHAR(64) UNIQUE,
    case_id VARCHAR(64),
    evidence_type VARCHAR(32),              -- DIGITAL, PHYSICAL, WITNESS_STATEMENT, DOCUMENT
    file_url VARCHAR(512),
    sha256_hash VARCHAR(64),               -- Cryptographic verification hash
    uploaded_by VARCHAR(64),
    trust_score DOUBLE PRECISION           -- Value between 0.0 and 100.0 computed by Trust Agent
);

-- Table: audit_log
-- Implements an append-only, SHA-256 hash-chain ledger.
-- Each entry_hash = SHA-256(prev_hash | actor_id | case_id | action_type | payload_hash | created_time)
-- Verify chain integrity: entry_hash of row N must equal prev_hash of row N+1.
CREATE TABLE audit_log (
    ROWID BIGINT,
    action_id VARCHAR(64) UNIQUE,
    actor_id VARCHAR(64),
    case_id VARCHAR(64),
    action_type VARCHAR(64),               -- AI_REASONING, EVIDENCE_UPLOAD, CASE_STATE_CHANGE, FIR_INGEST
    payload_hash VARCHAR(64),              -- SHA-256 of the state mutation payload (backward compat)
    prev_hash VARCHAR(64),                 -- entry_hash of the immediately preceding audit_log row
    entry_hash VARCHAR(64),                -- SHA-256 hash of this row (chain link)
    created_time DATETIME
);

-- Backward-compatibility alias: audit_ledger is retained in code references
-- but the canonical table name in this schema is audit_log.

