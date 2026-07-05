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
    case_number VARCHAR(64) UNIQUE, -- FIR Number
    title VARCHAR(256),
    description VARCHAR(2000),
    status VARCHAR(32), -- OPEN, UNDER_INVESTIGATION, CHARGE_SHEETED, CLOSED
    assigned_officer VARCHAR(64),
    created_time DATETIME
);

-- Table: evidence
CREATE TABLE evidence (
    ROWID BIGINT,
    evidence_id VARCHAR(64) UNIQUE,
    case_id VARCHAR(64),
    evidence_type VARCHAR(32), -- DIGITAL, PHYSICAL, WITNESS_STATEMENT, DOCUMENT
    file_url VARCHAR(512),
    sha256_hash VARCHAR(64), -- Cryptographic verification hash
    uploaded_by VARCHAR(64),
    trust_score DOUBLE -- Value between 0.0 and 100.0 computed by Trust Agent
);

-- Table: audit_ledger
CREATE TABLE audit_ledger (
    ROWID BIGINT,
    action_id VARCHAR(64) UNIQUE,
    actor_id VARCHAR(64),
    case_id VARCHAR(64),
    action_type VARCHAR(64), -- AI_REASONING, EVIDENCE_UPLOAD, CASE_STATE_CHANGE
    payload_hash VARCHAR(64), -- SHA-256 state mutation verification hash
    created_time DATETIME
);
