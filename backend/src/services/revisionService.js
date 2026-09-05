const pool = require("../config/database");


// ======================================================
// 1. GET ALL REVISIONS FOR A DOCUMENT
// ======================================================

async function getRevisions(documentId) {
  const result = await pool.query(
    `SELECT *
     FROM revisions
     WHERE document_id = $1
     ORDER BY sequence_order ASC`,
    [documentId]
  );

  return result.rows;
}


// ======================================================
// 2. MANUALLY CREATE A REVISION
// ======================================================

async function createRevision(documentId, revisionData) {
  const {
    revision_code,
    revision_stage,
    stage,
    issue_purpose,
    status,
    reason_for_issue,
    revision_date,
    created_by,
  } = revisionData;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const documentResult = await client.query(
      `SELECT id
       FROM documents
       WHERE id = $1`,
      [documentId]
    );

    if (documentResult.rows.length === 0) {
      throw new Error("Document not found");
    }

    const latestResult = await client.query(
      `SELECT sequence_order
       FROM revisions
       WHERE document_id = $1
       ORDER BY sequence_order DESC
       LIMIT 1`,
      [documentId]
    );

    const sequenceOrder =
      latestResult.rows.length === 0
        ? 1
        : latestResult.rows[0].sequence_order + 1;

    const result = await client.query(
      `INSERT INTO revisions (
        document_id,
        revision_code,
        sequence_order,
        revision_stage,
        stage,
        issue_purpose,
        status,
        reason_for_issue,
        revision_date,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        documentId,
        revision_code,
        sequenceOrder,
        revision_stage || null,
        stage || null,
        issue_purpose || null,
        status || null,
        reason_for_issue || null,
        revision_date || null,
        created_by || null,
      ]
    );

    await client.query(
      `UPDATE documents
       SET current_revision_id = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [result.rows[0].id, documentId]
    );

    await client.query("COMMIT");

    return result.rows[0];

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;

  } finally {
    client.release();
  }
}


// ======================================================
// 3. CALCULATE NEXT REVISION
// ======================================================

function calculateNextRevision(
  currentRevision,
  pattern,
  startRevision
) {
  // No previous revision
  if (!currentRevision) {
    return startRevision;
  }


  // ----------------------------------------------
  // NUMBER REVISION
  // Example:
  // 0 → 1 → 2 → 3
  // 1 → 2 → 3 → 4
  // ----------------------------------------------

  if (pattern === "NUMBER") {
    const number = Number(currentRevision);

    if (Number.isNaN(number)) {
      throw new Error(
        "Current revision is not a valid number"
      );
    }

    return String(number + 1);
  }


  // ----------------------------------------------
  // LETTER REVISION
  // Example:
  // A → B → C
  // Y → Z
  // Z → AA
  // AA → AB
  // ----------------------------------------------

  if (pattern === "LETTER") {

    let result = "";
    let number = 0;

    for (const char of currentRevision) {

      number =
        number * 26 +
        (char.charCodeAt(0) - 64);
    }

    number++;


    while (number > 0) {

      number--;

      result =
        String.fromCharCode(
          65 + (number % 26)
        ) + result;

      number =
        Math.floor(number / 26);
    }

    return result;
  }


  throw new Error(
    `Unsupported revision pattern: ${pattern}`
  );
}


// ======================================================
// 4. AUTOMATICALLY CREATE NEXT REVISION
// ======================================================

async function createNextRevision(
  documentId,
  revisionData
) {
  const {
    issue_purpose,
    status,
    reason_for_issue,
    revision_date,
    created_by,
  } = revisionData;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ----------------------------------------------
    // Find document and project
    // ----------------------------------------------

    const documentResult = await client.query(
      `SELECT d.id, d.project_id
       FROM documents d
       WHERE d.id = $1`,
      [documentId]
    );

    if (documentResult.rows.length === 0) {
      throw new Error("Document not found");
    }

    const projectId = documentResult.rows[0].project_id;

    // ----------------------------------------------
    // Get project's revision rule
    // ----------------------------------------------

    const ruleResult = await client.query(
      `SELECT *
       FROM project_revision_rules
       WHERE project_id = $1
       ORDER BY id ASC
       LIMIT 1`,
      [projectId]
    );

    if (ruleResult.rows.length === 0) {
      throw new Error(
        "No revision rule configured for this project"
      );
    }

    const rule = ruleResult.rows[0];

    // ----------------------------------------------
    // Determine whether this is APPROVED
    // ----------------------------------------------

    const approvedPurposes =
      rule.approved_issue_purposes || [];

    const isApproved =
      approvedPurposes.includes(issue_purpose);

    // ----------------------------------------------
    // Select correct revision system
    // ----------------------------------------------

    const pattern = isApproved
      ? rule.approved_revision_pattern
      : rule.review_revision_pattern;

    const startRevision = isApproved
      ? rule.approved_revision_start
      : rule.review_revision_start;

    // ----------------------------------------------
    // Find latest revision
    // ----------------------------------------------

    const latestResult = await client.query(
      `SELECT revision_code, sequence_order, revision_stage
       FROM revisions
       WHERE document_id = $1
       ORDER BY sequence_order DESC
       LIMIT 1`,
      [documentId]
    );

    let nextRevision;

    // ----------------------------------------------
    // FIRST REVISION
    // ----------------------------------------------

    if (latestResult.rows.length === 0) {

      nextRevision = startRevision;

    } else {

      const latest = latestResult.rows[0];

      // --------------------------------------------
      // REVIEW → APPROVED TRANSITION
      //
      // Example:
      //
      // A → B → C
      //          ↓
      //     Issued for Use
      //          ↓
      //          0
      // --------------------------------------------

      if (
        isApproved &&
        latest.revision_stage !== "APPROVED"
      ) {

        nextRevision = startRevision;

      } else {

        // ------------------------------------------
        // Continue current revision sequence
        //
        // A → B → C → D
        //
        // or
        //
        // 0 → 1 → 2 → 3
        // ------------------------------------------

        nextRevision = calculateNextRevision(
          latest.revision_code,
          pattern,
          startRevision
        );
      }
    }

    // ----------------------------------------------
    // Calculate chronological sequence
    // ----------------------------------------------

    const sequenceOrder =
      latestResult.rows.length === 0
        ? 1
        : latestResult.rows[0].sequence_order + 1;

    // ----------------------------------------------
    // Determine revision stage
    // ----------------------------------------------

    const revisionStage =
      isApproved
        ? "APPROVED"
        : "REVIEW";

    // ----------------------------------------------
    // Save revision
    // ----------------------------------------------

    const result = await client.query(
      `INSERT INTO revisions (
        document_id,
        revision_code,
        sequence_order,
        revision_stage,
        issue_purpose,
        status,
        reason_for_issue,
        revision_date,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        documentId,
        nextRevision,
        sequenceOrder,
        revisionStage,
        issue_purpose || null,
        status || null,
        reason_for_issue || null,
        revision_date || null,
        created_by || null,
      ]
    );

    await client.query(
      `UPDATE documents
       SET current_revision_id = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [result.rows[0].id, documentId]
    );

    await client.query("COMMIT");

    return result.rows[0];

  } catch (error) {

    await client.query("ROLLBACK");

    throw error;

  } finally {

    client.release();
  }
}


// ======================================================
// EXPORT FUNCTIONS
// ======================================================

module.exports = {
  getRevisions,
  createRevision,
  createNextRevision,
  calculateNextRevision,
};