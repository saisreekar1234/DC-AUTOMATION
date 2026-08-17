-- DOCUMENTS
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,

    project_id INTEGER NOT NULL
        REFERENCES projects(id) ON DELETE CASCADE,

    document_number VARCHAR(255) NOT NULL,
    prefix VARCHAR(100),
    title TEXT NOT NULL,

    vendor_document_number VARCHAR(255),
    customer_document_number VARCHAR(255),

    document_type VARCHAR(100),
    line_number VARCHAR(100),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(project_id, document_number)
);


-- REVISIONS
CREATE TABLE revisions (
    id SERIAL PRIMARY KEY,

    document_id INTEGER NOT NULL
        REFERENCES documents(id) ON DELETE CASCADE,

    revision_code VARCHAR(50) NOT NULL,

    stage VARCHAR(100),
    issue_purpose VARCHAR(150),
    status VARCHAR(100),
    reason_for_issue TEXT,

    revision_date DATE,

    created_by INTEGER
        REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(document_id, revision_code)
);


-- PROJECT REVISION RULES
CREATE TABLE project_revision_rules (
    id SERIAL PRIMARY KEY,

    project_id INTEGER NOT NULL
        REFERENCES projects(id) ON DELETE CASCADE,

    rule_name VARCHAR(100) NOT NULL,

    review_revision_start VARCHAR(50),
    review_revision_pattern VARCHAR(100),

    approved_revision_start VARCHAR(50),
    approved_revision_pattern VARCHAR(100),

    issue_purposes JSONB NOT NULL DEFAULT '[]',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(project_id, rule_name)
);