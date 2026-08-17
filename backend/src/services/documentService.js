const pool = require("../config/database");


// ======================================================
// 1. CREATE DOCUMENT
// ======================================================

async function createDocument(document) {
  const {
    project_id,
    document_number,
    title,
    vendor_document_number,
    customer_document_number,
    document_type,
    line_number,
  } = document;

  const result = await pool.query(
    `INSERT INTO documents (
      project_id,
      document_number,
      title,
      vendor_document_number,
      customer_document_number,
      document_type,
      line_number
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      project_id,
      document_number,
      title,
      vendor_document_number || null,
      customer_document_number || null,
      document_type || null,
      line_number || null,
    ]
  );

  return result.rows[0];
}


// ======================================================
// 2. GET DOCUMENTS FOR PROJECT
// ======================================================

async function getDocuments(projectId) {
  const result = await pool.query(
    `SELECT *
     FROM documents
     WHERE project_id = $1
     ORDER BY created_at DESC`,
    [projectId]
  );

  return result.rows;
}


// ======================================================
// 3. GET DOCUMENT BY ID
// ======================================================

async function getDocumentById(id) {
  const result = await pool.query(
    `SELECT *
     FROM documents
     WHERE id = $1`,
    [id]
  );

  return result.rows[0];
}

async function getCurrentRevision(documentId) {

  const result = await pool.query(
    `
    SELECT
      d.id AS document_id,
      d.document_number,
      d.title,
      d.project_id,

      r.id AS revision_id,
      r.revision_code,
      r.revision_stage,
      r.issue_purpose,
      r.status,
      r.sequence_order,
      r.revision_date

    FROM documents d

    LEFT JOIN revisions r
      ON r.id = d.current_revision_id

    WHERE d.id = $1
    `,
    [documentId]
  );

  return result.rows[0] || null;
}


// ======================================================
// EXPORT
// ======================================================

module.exports = {
  createDocument,
  getDocuments,
  getDocumentById,
  getCurrentRevision,
};