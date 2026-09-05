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
    `
      INSERT INTO documents (
        project_id,
        document_number,
        title,
        vendor_document_number,
        customer_document_number,
        document_type,
        line_number
      )

      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
      )

      RETURNING *
    `,
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
// 2. GET DOCUMENTS
//
// If projectId is supplied:
//     Return documents for that project.
//
// If projectId is not supplied:
//     Return all documents.
//
// Current revision information is included so the
// Document Register can display:
//
//     Revision
//     Stage
//     Status
//     Issue Purpose
//     Revision Date
//
// No revision/status values are fabricated.
// ======================================================

async function getDocuments(projectId = null) {

  const values = [];

  let projectClause = "";


  // ----------------------------------------------------
  // PROJECT FILTER
  // ----------------------------------------------------

  if (
    projectId !== null &&
    projectId !== undefined &&
    projectId !== ""
  ) {

    values.push(projectId);

    projectClause =
      "WHERE d.project_id = $1";

  }


  const result = await pool.query(
    `
      SELECT

        -- --------------------------------------------
        -- DOCUMENT
        -- --------------------------------------------

        d.*,


        -- --------------------------------------------
        -- PROJECT
        -- --------------------------------------------

        p.project_code,
        p.project_name,


        -- --------------------------------------------
        -- CURRENT REVISION
        -- --------------------------------------------

        r.id AS current_revision_record_id,

        r.revision_code
          AS current_revision_code,

        COALESCE(
          r.revision_stage,
          r.stage
        )
          AS current_revision_stage,

        r.stage
          AS current_revision_stage_value,

        r.issue_purpose
          AS current_revision_issue_purpose,

        r.status
          AS current_revision_status,

        r.revision_date
          AS current_revision_date,

        r.sequence_order
          AS current_revision_sequence


      FROM documents d


      -- --------------------------------------------
      -- PROJECT
      -- --------------------------------------------

      LEFT JOIN projects p
        ON p.id = d.project_id


      -- --------------------------------------------
      -- CURRENT / LATEST REVISION
      --
      -- If current_revision_id exists:
      --     use that revision.
      --
      -- If current_revision_id is NULL:
      --     fall back to the latest revision based
      --     on sequence_order and id.
      -- --------------------------------------------

      LEFT JOIN LATERAL (

        SELECT
          r.*

        FROM revisions r

        WHERE
          r.document_id = d.id

          AND (
            d.current_revision_id IS NULL
            OR r.id = d.current_revision_id
          )


        ORDER BY

          CASE
            WHEN r.id = d.current_revision_id
            THEN 0
            ELSE 1
          END,

          r.sequence_order DESC NULLS LAST,

          r.id DESC


        LIMIT 1

      ) r
        ON TRUE


      ${projectClause}


      ORDER BY
        d.created_at DESC,
        d.id DESC
    `,
    values
  );


  return result.rows;

}


// ======================================================
// 2B. GET DOCUMENTS FOR USER
//
// Normal users only receive documents belonging to
// active projects to which they are assigned.
//
// Administrators do NOT use this function.
// ======================================================

async function getDocumentsForUser(userId) {

  const result = await pool.query(
    `
      SELECT

        -- --------------------------------------------
        -- DOCUMENT
        -- --------------------------------------------

        d.*,


        -- --------------------------------------------
        -- PROJECT
        -- --------------------------------------------

        p.project_code,
        p.project_name,


        -- --------------------------------------------
        -- CURRENT REVISION
        -- --------------------------------------------

        r.id AS current_revision_record_id,

        r.revision_code
          AS current_revision_code,

        COALESCE(
          r.revision_stage,
          r.stage
        )
          AS current_revision_stage,

        r.stage
          AS current_revision_stage_value,

        r.issue_purpose
          AS current_revision_issue_purpose,

        r.status
          AS current_revision_status,

        r.revision_date
          AS current_revision_date,

        r.sequence_order
          AS current_revision_sequence


      FROM documents d


      -- --------------------------------------------
      -- USER PROJECT MEMBERSHIP
      -- --------------------------------------------

      INNER JOIN project_members pm

        ON pm.project_id = d.project_id

        AND pm.user_id = $1


      -- --------------------------------------------
      -- ACTIVE PROJECT
      -- --------------------------------------------

      INNER JOIN projects p

        ON p.id = d.project_id

        AND p.is_active = TRUE


      -- --------------------------------------------
      -- CURRENT / LATEST REVISION
      -- --------------------------------------------

      LEFT JOIN LATERAL (

        SELECT
          r.*

        FROM revisions r

        WHERE
          r.document_id = d.id

          AND (
            d.current_revision_id IS NULL
            OR r.id = d.current_revision_id
          )


        ORDER BY

          CASE
            WHEN r.id = d.current_revision_id
            THEN 0
            ELSE 1
          END,

          r.sequence_order DESC NULLS LAST,

          r.id DESC


        LIMIT 1

      ) r
        ON TRUE


      ORDER BY
        d.created_at DESC,
        d.id DESC
    `,
    [userId]
  );


  return result.rows;

}


// ======================================================
// 3. GET DOCUMENT BY ID
// ======================================================
//
// Returns the document together with project information
// and its current revision.
// ======================================================

async function getDocumentById(id) {

  const result = await pool.query(
    `
      SELECT

        d.*,

        p.project_code,
        p.project_name,

        r.id AS current_revision_record_id,

        r.revision_code
          AS current_revision_code,

        COALESCE(
          r.revision_stage,
          r.stage
        )
          AS current_revision_stage,

        r.stage
          AS current_revision_stage_value,

        r.issue_purpose
          AS current_revision_issue_purpose,

        r.status
          AS current_revision_status,

        r.revision_date
          AS current_revision_date,

        r.sequence_order
          AS current_revision_sequence


      FROM documents d


      LEFT JOIN projects p
        ON p.id = d.project_id


      LEFT JOIN revisions r
        ON r.id = d.current_revision_id


      WHERE d.id = $1

      LIMIT 1
    `,
    [id]
  );


  return result.rows[0] || null;

}


// ======================================================
// 4. GET CURRENT REVISION
// ======================================================

async function getCurrentRevision(documentId) {

  const result = await pool.query(
    `
      SELECT

        -- --------------------------------------------
        -- DOCUMENT
        -- --------------------------------------------

        d.id AS document_id,

        d.document_number,

        d.title,

        d.project_id,


        -- --------------------------------------------
        -- PROJECT
        -- --------------------------------------------

        p.project_code,

        p.project_name,


        -- --------------------------------------------
        -- REVISION
        -- --------------------------------------------

        r.id AS revision_id,

        r.revision_code,

        COALESCE(
          r.revision_stage,
          r.stage
        )
          AS revision_stage,

        r.stage,

        r.issue_purpose,

        r.status,

        r.sequence_order,

        r.revision_date


      FROM documents d


      LEFT JOIN projects p
        ON p.id = d.project_id


      LEFT JOIN revisions r
        ON r.id = d.current_revision_id


      WHERE d.id = $1

      LIMIT 1
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

  getDocumentsForUser,

  getDocumentById,

  getCurrentRevision,

};