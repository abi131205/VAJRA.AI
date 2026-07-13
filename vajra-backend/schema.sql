-- VAJRA.AI Data Store Relational Database Schema
-- Fully aligned with the Karnataka State Police (KSP) Crime Database ER Diagram

-- 1. Reference & Lookup Tables
CREATE TABLE State (
    ROWID BIGINT,
    StateID INT UNIQUE,
    StateName VARCHAR(128) NOT NULL,
    NationalityID INT,
    Active BIT DEFAULT 1
);

CREATE TABLE District (
    ROWID BIGINT,
    DistrictID INT UNIQUE,
    DistrictName VARCHAR(128) NOT NULL,
    StateID INT,
    Active BIT DEFAULT 1
);

CREATE TABLE UnitType (
    ROWID BIGINT,
    UnitTypeID INT UNIQUE,
    UnitTypeName VARCHAR(128) NOT NULL,
    CityDistState VARCHAR(256)
);

CREATE TABLE Unit (
    ROWID BIGINT,
    UnitID INT UNIQUE, -- Police Station / Office ID
    UnitName VARCHAR(256) NOT NULL,
    TypeID INT,
    ParentUnit INT,
    NationalityID INT,
    StateID INT,
    DistrictID INT,
    Active BIT DEFAULT 1,
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6)
);

CREATE TABLE Rank (
    ROWID BIGINT,
    RankID INT UNIQUE,
    RankName VARCHAR(128) NOT NULL, -- e.g. Constable, Inspector, DSP
    Hierarchy INT,
    Active BIT DEFAULT 1
);

CREATE TABLE Designation (
    ROWID BIGINT,
    DesignationID INT UNIQUE,
    DesignationName VARCHAR(128) NOT NULL, -- e.g. Investigating Officer, SHO
    Active BIT DEFAULT 1,
    SortOrder INT
);

CREATE TABLE CaseCategory (
    ROWID BIGINT,
    CaseCategoryID INT UNIQUE,
    LookupValue VARCHAR(64) NOT NULL -- FIR, UDR, PAR, Zero FIR...
);

CREATE TABLE GravityOffence (
    ROWID BIGINT,
    GravityOffenceID INT UNIQUE,
    LookupValue VARCHAR(128) NOT NULL -- Heinous, Non-Heinous
);

CREATE TABLE CaseStatusMaster (
    ROWID BIGINT,
    CaseStatusID INT UNIQUE,
    CaseStatusName VARCHAR(128) NOT NULL -- OPEN, UNDER_INVESTIGATION, CHARGE_SHEETED, CLOSED
);

CREATE TABLE CasteMaster (
    ROWID BIGINT,
    caste_master_id INT UNIQUE,
    caste_master_name VARCHAR(128) NOT NULL
);

CREATE TABLE ReligionMaster (
    ROWID BIGINT,
    ReligionID INT UNIQUE,
    ReligionName VARCHAR(128) NOT NULL
);

CREATE TABLE OccupationMaster (
    ROWID BIGINT,
    OccupationID INT UNIQUE,
    OccupationName VARCHAR(128) NOT NULL
);

-- 2. Employee (Officers & Staff) Table
CREATE TABLE Employee (
    ROWID BIGINT,
    EmployeeID INT UNIQUE,
    KGID VARCHAR(64) UNIQUE, -- Karnataka Government ID
    FirstName VARCHAR(128) NOT NULL,
    email VARCHAR(128) UNIQUE, -- Added for VAJRA Auth
    password_hash VARCHAR(255), -- Added for VAJRA Auth
    DistrictID INT,
    UnitID INT,
    RankID INT,
    DesignationID INT,
    EmployeeDOB DATE,
    GenderID INT,
    BloodGroupID INT,
    PhysicallyChallenged BIT DEFAULT 0,
    AppointmentDate DATE,
    status VARCHAR(16) DEFAULT 'ACTIVE'
);

-- 3. Core Crime & Case Tables
CREATE TABLE CaseMaster (
    ROWID BIGINT,
    CaseMasterID INT UNIQUE,
    CrimeNo VARCHAR(64) UNIQUE, -- Format: caseCategoryCode + districtID + stationID + year + serial
    CaseNo VARCHAR(64) UNIQUE,  -- Format: YYYY + 5-digit serial (last 9 of CrimeNo)
    CrimeRegisteredDate DATETIME NOT NULL,
    IncidentFromDate DATETIME,
    IncidentToDate DATETIME,
    InfoReceivedPSDate DATETIME,
    PolicePersonID INT, -- Employee who registered FIR
    PoliceStationID INT, -- Unit where FIR is registered
    CaseCategoryID INT,
    GravityOffenceID INT,
    CrimeMajorHeadID INT, -- CrimeHead.CrimeHeadID
    CrimeMinorHeadID INT, -- CrimeSubHead.CrimeSubHeadID
    CaseStatusID INT,
    CourtID INT,
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    BriefFacts VARCHAR(2000), -- Summary of the case
    -- Ingress Pipeline additions:
    zia_ocr_done BOOLEAN DEFAULT FALSE,
    fir_document_url VARCHAR(512),
    ocr_extracted_text VARCHAR(2000)
);

CREATE TABLE ComplainantDetails (
    ROWID BIGINT,
    ComplainantID INT UNIQUE,
    CaseMasterID INT,
    ComplainantName VARCHAR(200) NOT NULL,
    AgeYear INT,
    OccupationID INT,
    ReligionID INT,
    CasteID INT,
    GenderID INT
);

CREATE TABLE Victim (
    ROWID BIGINT,
    VictimMasterID INT UNIQUE,
    CaseMasterID INT,
    VictimName VARCHAR(200) NOT NULL,
    AgeYear INT,
    GenderID INT,
    VictimPolice VARCHAR(16) -- "1" if police, "0" otherwise
);

CREATE TABLE Accused (
    ROWID BIGINT,
    AccusedMasterID INT UNIQUE,
    CaseMasterID INT,
    AccusedName VARCHAR(200) NOT NULL,
    AgeYear INT,
    GenderID INT,
    PersonID VARCHAR(32) -- Accused identifier sorting: A1, A2...
);

CREATE TABLE ArrestSurrender (
    ROWID BIGINT,
    ArrestSurrenderID INT UNIQUE,
    CaseMasterID INT,
    ArrestSurrenderTypeID INT,
    ArrestSurrenderDate DATETIME,
    ArrestSurrenderStateID INT,
    ArrestSurrenderDistrictID INT,
    PoliceStationID INT,
    IOID INT, -- Investigating Officer (EmployeeID)
    CourtID INT,
    AccusedMasterID INT,
    IsAccused BIT DEFAULT 1,
    IsComplainantAccused BIT DEFAULT 0
);

CREATE TABLE Act (
    ROWID BIGINT,
    ActCode VARCHAR(64) UNIQUE, -- e.g. IPC, BNS, NDPS
    ActDescription VARCHAR(512) NOT NULL,
    ShortName VARCHAR(128),
    Active BIT DEFAULT 1
);

CREATE TABLE Section (
    ROWID BIGINT,
    ActCode VARCHAR(64),
    SectionCode VARCHAR(64),
    SectionDescription VARCHAR(1000),
    Active BIT DEFAULT 1
);

CREATE TABLE ActSectionAssociation (
    ROWID BIGINT,
    CaseMasterID INT,
    ActID INT,
    SectionID INT,
    ActOrderID INT,
    SectionOrderID INT
);

CREATE TABLE ChargesheetDetails (
    ROWID BIGINT,
    CSID INT UNIQUE,
    CaseMasterID INT,
    csdate DATETIME,
    cstype CHAR(1), -- A->Chargesheet, B->False Case, C->Undetected
    PolicePersonID INT
);

CREATE TABLE Court (
    ROWID BIGINT,
    CourtID INT UNIQUE,
    CourtName VARCHAR(256) NOT NULL,
    DistrictID INT,
    StateID INT,
    Active BIT DEFAULT 1
);

CREATE TABLE CrimeHead (
    ROWID BIGINT,
    CrimeHeadID INT UNIQUE,
    CrimeGroupName VARCHAR(256) NOT NULL, -- e.g. Crimes Against Body, Theft
    Active BIT DEFAULT 1
);

CREATE TABLE CrimeSubHead (
    ROWID BIGINT,
    CrimeSubHeadID INT UNIQUE,
    CrimeHeadID INT,
    CrimeHeadName VARCHAR(256) NOT NULL, -- e.g. Murder, Robbery
    SeqID INT
);

CREATE TABLE CrimeHeadActSection (
    ROWID BIGINT,
    CrimeHeadID INT,
    ActCode VARCHAR(64),
    SectionCode VARCHAR(64)
);

-- 4. VAJRA.AI Ingress, Audit, and Machine Learning Tables
CREATE TABLE evidence (
    ROWID BIGINT,
    evidence_id VARCHAR(64) UNIQUE,
    case_id VARCHAR(64), -- Maps to CaseMaster.CaseNo or CaseMaster.CrimeNo
    evidence_type VARCHAR(32), -- DIGITAL, PHYSICAL, WITNESS_STATEMENT, DOCUMENT
    file_url VARCHAR(512),
    sha256_hash VARCHAR(64),
    uploaded_by VARCHAR(64),
    trust_score DOUBLE PRECISION
);

CREATE TABLE timeline_events (
    ROWID BIGINT,
    event_id VARCHAR(64) UNIQUE,
    case_id VARCHAR(64),
    evidence_id VARCHAR(64),
    timestamp DATETIME,
    title VARCHAR(256),
    description VARCHAR(2000),
    evidence_source VARCHAR(128),
    confidence DOUBLE PRECISION
);

CREATE TABLE audit_log (
    ROWID BIGINT,
    action_id VARCHAR(64) UNIQUE,
    actor_id VARCHAR(64),
    case_id VARCHAR(64),
    action_type VARCHAR(64),
    payload_hash VARCHAR(64),
    prev_hash VARCHAR(64),
    entry_hash VARCHAR(64),
    created_time DATETIME
);

CREATE TABLE phone_records (
    ROWID BIGINT,
    record_id VARCHAR(64) UNIQUE,
    person_id VARCHAR(64),
    phone_number VARCHAR(16),
    carrier VARCHAR(64),
    last_seen_lat DECIMAL(9,6),
    last_seen_lng DECIMAL(9,6)
);

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
    shap_json VARCHAR(2000),
    created_time DATETIME
);
