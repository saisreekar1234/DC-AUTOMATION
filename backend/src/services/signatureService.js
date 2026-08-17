const pool = require("../config/database");


// ======================================================
// 1. SAVE USER SIGNATURE
// ======================================================

async function saveUserSignature(userId, file) {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    // Check user exists
    const userResult = await client.query(
      `SELECT id
       FROM users
       WHERE id = $1
         AND is_active = TRUE`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error("User not found or inactive");
    }

    // Deactivate previous signature
    await client.query(
      `UPDATE user_signatures
       SET is_active = FALSE
       WHERE user_id = $1
         AND is_active = TRUE`,
      [userId]
    );

    // Save new signature
    const result = await client.query(
      `INSERT INTO user_signatures (
        user_id,
        signature_file_path,
        signature_file_name,
        is_active
      )
      VALUES ($1, $2, $3, TRUE)
      RETURNING *`,
      [
        userId,
        file.path,
        file.originalname,
      ]
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
// 2. GET ACTIVE SIGNATURE
// ======================================================

async function getActiveSignature(userId) {

  const result = await pool.query(
    `SELECT *
     FROM user_signatures
     WHERE user_id = $1
       AND is_active = TRUE
     ORDER BY uploaded_at DESC
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
}


// ======================================================
// 3. GET ALL USER SIGNATURES
// ======================================================

async function getUserSignatures(userId) {

  const result = await pool.query(
    `SELECT
       id,
       user_id,
       signature_file_name,
       is_active,
       uploaded_at,
       created_at
     FROM user_signatures
     WHERE user_id = $1
     ORDER BY uploaded_at DESC`,
    [userId]
  );

  return result.rows;
}


// ======================================================
// 4. CREATE SIGNATURE WORKFLOW
//
// Creates one document_signatures record for each
// configured project signature step.
//
// Example:
//
// PREPARED_BY
// CHECKED_BY
// APPROVED_BY
// ======================================================

async function createSignatureWorkflow(
  documentId,
  revisionId
) {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    // --------------------------------------------------
    // Find document + project
    // --------------------------------------------------

    const documentResult = await client.query(
      `SELECT
         d.id,
         d.project_id
       FROM documents d
       WHERE d.id = $1`,
      [documentId]
    );

    if (documentResult.rows.length === 0) {
      throw new Error("Document not found");
    }

    const document = documentResult.rows[0];

    // --------------------------------------------------
    // Verify revision belongs to document
    // --------------------------------------------------

    const revisionResult = await client.query(
      `SELECT
         id,
         document_id,
         revision_code
       FROM revisions
       WHERE id = $1
         AND document_id = $2`,
      [
        revisionId,
        documentId,
      ]
    );

    if (revisionResult.rows.length === 0) {
      throw new Error(
        "Revision not found for this document"
      );
    }

    // --------------------------------------------------
    // Get project signature rule
    // --------------------------------------------------

    const ruleResult = await client.query(
      `SELECT *
       FROM project_signature_rules
       WHERE project_id = $1
       ORDER BY id ASC
       LIMIT 1`,
      [document.project_id]
    );

    if (ruleResult.rows.length === 0) {
      throw new Error(
        "No signature rule configured for this project"
      );
    }

    const rule = ruleResult.rows[0];

    // --------------------------------------------------
    // Check whether signature is required
    // --------------------------------------------------

    if (!rule.signature_required) {

      await client.query("COMMIT");

      return [];
    }

    // --------------------------------------------------
    // Get signature steps
    // --------------------------------------------------

    const stepsResult = await client.query(
      `SELECT
         id,
         step_order,
         signature_role,
         assigned_user_id,
         is_required
       FROM project_signature_steps
       WHERE project_signature_rule_id = $1
       ORDER BY step_order ASC`,
      [rule.id]
    );

    if (stepsResult.rows.length === 0) {
      throw new Error(
        "No signature steps configured for this project"
      );
    }

    // --------------------------------------------------
    // Prevent duplicate workflow
    // --------------------------------------------------

    const existingResult = await client.query(
      `SELECT id
       FROM document_signatures
       WHERE document_id = $1
         AND revision_id = $2
       LIMIT 1`,
      [
        documentId,
        revisionId,
      ]
    );

    if (existingResult.rows.length > 0) {

      throw new Error(
        "Signature workflow already exists for this revision"
      );
    }

    // --------------------------------------------------
    // Create signature records
    // --------------------------------------------------

    const created = [];

    for (const step of stepsResult.rows) {

      const status =
        step.step_order === 1
          ? "PENDING"
          : "WAITING";

      const result = await client.query(
        `INSERT INTO document_signatures (
          document_id,
          revision_id,
          signature_role,
          signature_required,
          signature_status,
          signed_by,
          signed_at,
          source
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          NULL,
          NULL,
          NULL
        )
        RETURNING *`,
        [
          documentId,
          revisionId,
          step.signature_role,
          step.is_required,
          status,
        ]
      );

      created.push(result.rows[0]);
    }

    await client.query("COMMIT");

    return created;

  } catch (error) {

    await client.query("ROLLBACK");

    throw error;

  } finally {

    client.release();
  }
}


// ======================================================
// 5. GET SIGNATURE WORKFLOW
// ======================================================

async function getSignatureWorkflow(
  documentId,
  revisionId
) {

  const result = await pool.query(
    `SELECT
       ds.*,
       u.name AS signed_by_name,
       us.signature_file_name
     FROM document_signatures ds

     LEFT JOIN users u
       ON u.id = ds.signed_by

     LEFT JOIN user_signatures us
       ON us.id = ds.signature_id

     WHERE ds.document_id = $1
       AND ds.revision_id = $2

     ORDER BY ds.id ASC`,
    [
      documentId,
      revisionId,
    ]
  );

  return result.rows;
}


// ======================================================
// 6. SIGN CURRENT STEP
// ======================================================

async function signDocumentStep(
  documentSignatureId,
  userId
) {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    // --------------------------------------------------
    // Get signature step
    // --------------------------------------------------

    const signatureResult = await client.query(
      `SELECT *
       FROM document_signatures
       WHERE id = $1
       FOR UPDATE`,
      [documentSignatureId]
    );

    if (signatureResult.rows.length === 0) {
      throw new Error(
        "Document signature record not found"
      );
    }

    const signature =
      signatureResult.rows[0];

    // --------------------------------------------------
    // Already signed?
    // --------------------------------------------------

    if (
      signature.signature_status === "SIGNED"
    ) {
      throw new Error(
        "This signature step is already signed"
      );
    }

    // --------------------------------------------------
    // Must be current step
    // --------------------------------------------------

    if (
      signature.signature_status !== "PENDING"
    ) {
      throw new Error(
        "This signature step is not currently available"
      );
    }

    // --------------------------------------------------
    // Check user
    // --------------------------------------------------

    const userResult = await client.query(
      `SELECT id, name
       FROM users
       WHERE id = $1
         AND is_active = TRUE`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error(
        "Signing user not found or inactive"
      );
    }

    // --------------------------------------------------
    // Get configured step
    // --------------------------------------------------

    const stepResult = await client.query(
      `SELECT
         pss.*,
         psr.id AS rule_id
       FROM project_signature_steps pss

       JOIN project_signature_rules psr
         ON psr.id =
            pss.project_signature_rule_id

       JOIN documents d
         ON d.project_id =
            psr.project_id

       WHERE d.id = $1
         AND pss.signature_role = $2

       LIMIT 1`,
      [
        signature.document_id,
        signature.signature_role,
      ]
    );

    if (stepResult.rows.length === 0) {
      throw new Error(
        "Signature role is not configured for this project"
      );
    }

    const step = stepResult.rows[0];

    // --------------------------------------------------
    // Check assigned user
    //
    // If assigned_user_id is configured, only that
    // user may sign.
    // --------------------------------------------------

    if (
      step.assigned_user_id !== null &&
      Number(step.assigned_user_id) !== Number(userId)
    ) {

      throw new Error(
        `User is not assigned to ${signature.signature_role}`
      );
    }

    // --------------------------------------------------
    // Get ACTIVE signature
    // --------------------------------------------------

    const activeSignatureResult =
      await client.query(
        `SELECT *
         FROM user_signatures
         WHERE user_id = $1
           AND is_active = TRUE
         ORDER BY uploaded_at DESC
         LIMIT 1`,
        [userId]
      );

    if (
      activeSignatureResult.rows.length === 0
    ) {
      throw new Error(
        "User does not have an active signature"
      );
    }

    const activeSignature =
      activeSignatureResult.rows[0];

    // --------------------------------------------------
    // Sign
    // --------------------------------------------------

    const signedResult = await client.query(
      `UPDATE document_signatures
       SET
         signature_status = 'SIGNED',
         signed_by = $1,
         signature_id = $2,
         signed_at = CURRENT_TIMESTAMP,
         source = 'USER_SIGNATURE',
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [
        userId,
        activeSignature.id,
        documentSignatureId,
      ]
    );

    // --------------------------------------------------
    // Activate next step
    // --------------------------------------------------

    const nextResult = await client.query(
      `SELECT id
       FROM document_signatures
       WHERE document_id = $1
         AND revision_id = $2
         AND id > $3
         AND signature_status = 'WAITING'
       ORDER BY id ASC
       LIMIT 1`,
      [
        signature.document_id,
        signature.revision_id,
        documentSignatureId,
      ]
    );

    if (nextResult.rows.length > 0) {

      await client.query(
        `UPDATE document_signatures
         SET
           signature_status = 'PENDING',
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [nextResult.rows[0].id]
      );
    }

    await client.query("COMMIT");

    return signedResult.rows[0];

  } catch (error) {

    await client.query("ROLLBACK");

    throw error;

  } finally {

    client.release();
  }
}


// ======================================================
// EXPORT
// ======================================================

module.exports = {
  saveUserSignature,
  getActiveSignature,
  getUserSignatures,

  createSignatureWorkflow,
  getSignatureWorkflow,
  signDocumentStep,
};