-- ======================================================
-- 006 CUSTOMER TRANSMITTAL + SIGNATURE CONFIGURATION
-- ======================================================


-- ======================================================
-- 1. PROJECT SIGNATURE RULES
-- ======================================================

CREATE TABLE project_signature_rules (
    id SERIAL PRIMARY KEY,

    project_id INTEGER NOT NULL
        REFERENCES projects(id)
        ON DELETE CASCADE,

    signature_required BOOLEAN NOT NULL DEFAULT TRUE,

    signature_mode VARCHAR(50) NOT NULL DEFAULT 'FROM_BEGINNING',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_project_signature_rule
        UNIQUE (project_id),

    CONSTRAINT valid_signature_mode
        CHECK (
            signature_mode IN (
                'FROM_BEGINNING',
                'AFTER_APPROVAL',
                'NEVER'
            )
        )
);


-- ======================================================
-- 2. CUSTOMER RESPONSE CODES
-- ======================================================

CREATE TABLE customer_response_rules (
    id SERIAL PRIMARY KEY,

    project_id INTEGER NOT NULL
        REFERENCES projects(id)
        ON DELETE CASCADE,

    response_code VARCHAR(20) NOT NULL,

    response_type VARCHAR(50) NOT NULL,

    description VARCHAR(255),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_project_response_code
        UNIQUE (project_id, response_code)
);


-- ======================================================
-- 3. CUSTOMER TRANSMITTALS
-- ======================================================

CREATE TABLE customer_transmittals (
    id SERIAL PRIMARY KEY,

    project_id INTEGER NOT NULL
        REFERENCES projects(id)
        ON DELETE CASCADE,

    file_name VARCHAR(255) NOT NULL,

    file_path TEXT NOT NULL,

    customer_name VARCHAR(255),

    transmittal_reference VARCHAR(255),

    transmittal_date DATE,

    analysis_status VARCHAR(50) NOT NULL DEFAULT 'UPLOADED',

    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    uploaded_by INTEGER,

    analyzed_at TIMESTAMP,

    analysis_error TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_analysis_status
        CHECK (
            analysis_status IN (
                'UPLOADED',
                'ANALYSING',
                'ANALYSED',
                'FAILED'
            )
        )
);


-- ======================================================
-- 4. CUSTOMER TRANSMITTAL ITEMS
-- ======================================================

CREATE TABLE customer_transmittal_items (
    id SERIAL PRIMARY KEY,

    transmittal_id INTEGER NOT NULL
        REFERENCES customer_transmittals(id)
        ON DELETE CASCADE,

    document_id INTEGER
        REFERENCES documents(id)
        ON DELETE SET NULL,

    customer_document_number VARCHAR(255),

    customer_revision VARCHAR(50),

    purpose_code VARCHAR(20),

    response_type VARCHAR(50),

    description TEXT,

    quantity_or_nature VARCHAR(100),

    confidence NUMERIC(5,2),

    raw_text TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ======================================================
-- 5. INDEXES
-- ======================================================

CREATE INDEX idx_signature_rules_project
    ON project_signature_rules(project_id);

CREATE INDEX idx_customer_response_rules_project
    ON customer_response_rules(project_id);

CREATE INDEX idx_customer_transmittals_project
    ON customer_transmittals(project_id);

CREATE INDEX idx_customer_transmittal_items_transmittal
    ON customer_transmittal_items(transmittal_id);

CREATE INDEX idx_customer_transmittal_items_document
    ON customer_transmittal_items(document_id);