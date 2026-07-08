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

-- ─────────────────────────────────────────────────────────────────────────────
-- Extended Schema: Jurisdiction, Persons, Vehicles, CDR, Predictions
-- (Appended per audit report section 2.1)
-- ─────────────────────────────────────────────────────────────────────────────

-- Table: stations (Jurisdiction Reference)
CREATE TABLE stations (
    ROWID BIGINT,
    station_id VARCHAR(64) UNIQUE,
    name VARCHAR(200) NOT NULL,
    district VARCHAR(100) NOT NULL,
    range_name VARCHAR(100),
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    contact VARCHAR(20),
    created_time DATETIME
);

-- Table: persons (Suspects, Victims, Witnesses)
CREATE TABLE persons (
    ROWID BIGINT,
    person_id VARCHAR(64) UNIQUE,
    name VARCHAR(200) NOT NULL,
    aliases VARCHAR(1000),        -- JSON array representation of aliases
    dob DATE,
    gender VARCHAR(16),           -- M, F, Other, Unknown
    address VARCHAR(2000),
    aadhaar_hash CHAR(64),        -- SHA-256 of Aadhaar; never store raw Aadhaar
    risk_score DOUBLE PRECISION DEFAULT 0.0,
    photo_stratus_url VARCHAR(512),
    created_time DATETIME
);

-- Table: case_persons (Case-Person Junction Table)
CREATE TABLE case_persons (
    ROWID BIGINT,
    id VARCHAR(64) UNIQUE,
    case_id VARCHAR(64),
    person_id VARCHAR(64),
    role VARCHAR(32)              -- ACCUSED, VICTIM, WITNESS, INFORMANT
);

-- Table: vehicles
CREATE TABLE vehicles (
    ROWID BIGINT,
    vehicle_id VARCHAR(64) UNIQUE,
    reg_no VARCHAR(32) UNIQUE,
    type VARCHAR(64),
    owner_person_id VARCHAR(64)
);

-- Table: phone_records (CDR / Call Data Records)
CREATE TABLE phone_records (
    ROWID BIGINT,
    record_id VARCHAR(64) UNIQUE,
    person_id VARCHAR(64),
    phone_number VARCHAR(16),
    carrier VARCHAR(64),
    last_seen_lat DECIMAL(9,6),
    last_seen_lng DECIMAL(9,6)
);

-- Table: predictions (QuickML crime hotspot forecast outputs)
CREATE TABLE predictions (
    ROWID BIGINT,
    prediction_id VARCHAR(64) UNIQUE,
    district VARCHAR(100) NOT NULL,
    grid_cell_id VARCHAR(32),
    crime_type VARCHAR(64),
    predicted_count INT,
    confidence DOUBLE PRECISION,
    window_start DATETIME,
    window_end DATETIME,
    model_version VARCHAR(32),
    shap_json VARCHAR(2000),      -- JSON-serialised SHAP feature importance
    created_time DATETIME
);

