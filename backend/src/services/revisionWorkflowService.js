const pool = require("../config/database");


// ======================================================
// GET PROJECT REVISION RULE
// ======================================================

async function getRevisionRule(projectId, client) {

  const result = await client.query(
    `
    SELECT
      id,
      project_id,
      rule_name,
      review_revision_start,
      review_revision_pattern,
      approved_revision_start,
      approved_revision_pattern,
      issue_purposes,
      approved_issue_purposes
    FROM project_revision_rules
    WHERE project_id = $1
    ORDER BY id
    LIMIT 1
    `,
    [projectId]
  );

  return result.rows[0] || null;
}


// ======================================================
// CALCULATE NEXT LETTER
// ======================================================

function calculateNextLetter(
  currentRevision,
  startRevision
) {

  if (!currentRevision) {
    return startRevision;
  }

  let number = 0;

  for (
    const character of currentRevision.toUpperCase()
  ) {

    if (
      character < "A" ||
      character > "Z"
    ) {
      throw new Error(
        `Invalid LETTER revision: ${currentRevision}`
      );
    }

    number =
      number * 26 +
      (character.charCodeAt(0) - 64);
  }

  number++;

  let result = "";

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


// ======================================================
// CALCULATE NEXT NUMBER
// ======================================================

function calculateNextNumber(
  currentRevision,
  startRevision
) {

  if (!currentRevision) {
    return startRevision;
  }

  const number =
    Number(currentRevision);

  if (Number.isNaN(number)) {
    throw new Error(
      `Invalid NUMBER revision: ${currentRevision}`
    );
  }

  return String(number + 1);
}


// ======================================================
// GET NEXT REVIEW REVISION
// ======================================================

async function getNextReviewRevision(
  documentId,
  projectId,
  client
) {

  const rule =
    await getRevisionRule(
      projectId,
      client
    );

  if (!rule) {
    throw new Error(
      "No revision rule configured for this project"
    );
  }

  const result =
    await client.query(
      `
      SELECT revision_code
      FROM revisions
      WHERE document_id = $1
        AND revision_stage = 'REVIEW'
      ORDER BY sequence_order DESC, id DESC
      `,
      [documentId]
    );

  const reviewRevisions =
    result.rows.map(
      row => row.revision_code
    );

  if (
    reviewRevisions.length === 0
  ) {

    return rule.review_revision_start;
  }

  const latestReview =
    reviewRevisions[0];

  if (
    rule.review_revision_pattern ===
    "LETTER"
  ) {

    return calculateNextLetter(
      latestReview,
      rule.review_revision_start
    );
  }

  if (
    rule.review_revision_pattern ===
    "NUMBER"
  ) {

    return calculateNextNumber(
      latestReview,
      rule.review_revision_start
    );
  }

  throw new Error(
    `Unsupported review revision pattern: ${rule.review_revision_pattern}`
  );
}


// ======================================================
// GET NEXT SEQUENCE
// ======================================================

async function getNextSequence(
  documentId,
  client
) {

  const result =
    await client.query(
      `
      SELECT
        COALESCE(
          MAX(sequence_order),
          0
        ) + 1 AS next_sequence
      FROM revisions
      WHERE document_id = $1
      `,
      [documentId]
    );

  return Number(
    result.rows[0].next_sequence
  );
}


// ======================================================
// CREATE SIGNATURE WORKFLOW
// ======================================================

async function createSignatureWorkflow(
  documentId,
  revisionId,
  projectId,
  client
) {

  const stepsResult =
    await client.query(
      `
      SELECT
        pss.id,
        pss.step_order,
        pss.signature_role,
        pss.assigned_user_id,
        pss.is_required
      FROM project_signature_steps pss
      INNER JOIN project_signature_rules psr
        ON psr.id = pss.project_signature_rule_id
      WHERE psr.project_id = $1
      ORDER BY pss.step_order
      `,
      [projectId]
    );

  const steps =
    stepsResult.rows;

  if (steps.length === 0) {
    throw new Error(
      "No signature steps configured for this project"
    );
  }


  for (
    let index = 0;
    index < steps.length;
    index++
  ) {

    const step =
      steps[index];

    const status =
      index === 0
        ? "PENDING"
        : "WAITING";

    await client.query(
      `
      INSERT INTO document_signatures (
        document_id,
        revision_id,
        signature_role,
        signature_required,
        signature_status,
        signed_by,
        signature_id
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        NULL,
        NULL
      )
      `,
      [
        documentId,
        revisionId,
        step.signature_role,
        step.is_required,
        status,
      ]
    );
  }

  return steps;
}


// ======================================================
// CREATE REVIEW REVISION
// ======================================================

async function createReviewRevision(
  transmittalItemId
) {

  const client =
    await pool.connect();

  try {

    await client.query(
      "BEGIN"
    );


    // --------------------------------------------------
    // Get customer transmittal item
    // --------------------------------------------------

    const itemResult =
      await client.query(
        `
        SELECT
          cti.*,
          ct.project_id,
          d.id AS internal_document_id,
          d.document_number,
          d.title
        FROM customer_transmittal_items cti
        INNER JOIN customer_transmittals ct
          ON ct.id = cti.transmittal_id
        INNER JOIN documents d
          ON d.id = cti.document_id
        WHERE cti.id = $1
        FOR UPDATE
        `,
        [transmittalItemId]
      );


    if (
      itemResult.rows.length === 0
    ) {

      throw new Error(
        "Customer transmittal item not found or document is not mapped"
      );
    }


    const item =
      itemResult.rows[0];


    // --------------------------------------------------
    // Lock the document separately
    // --------------------------------------------------

    const documentResult =
      await client.query(
        `
        SELECT
          id,
          project_id,
          document_number,
          title,
          current_revision_id
        FROM documents
        WHERE id = $1
        FOR UPDATE
        `,
        [item.internal_document_id]
      );


    if (
      documentResult.rows.length === 0
    ) {

      throw new Error(
        "Internal document not found"
      );
    }


    const document =
      documentResult.rows[0];


    // --------------------------------------------------
    // Current revision must exist
    // --------------------------------------------------

    if (
      !document.current_revision_id
    ) {

      throw new Error(
        "Document does not have a current revision"
      );
    }


    const currentRevisionResult =
      await client.query(
        `
        SELECT *
        FROM revisions
        WHERE id = $1
        `,
        [document.current_revision_id]
      );


    if (
      currentRevisionResult.rows.length === 0
    ) {

      throw new Error(
        "Current revision not found"
      );
    }


    const currentRevision =
      currentRevisionResult.rows[0];


    // --------------------------------------------------
    // Current revision must be APPROVED
    // --------------------------------------------------

    if (
      currentRevision.revision_stage !==
      "APPROVED"
    ) {

      throw new Error(
        "Current document revision is not an approved revision"
      );
    }


    // --------------------------------------------------
    // Prevent duplicate active review revision
    // --------------------------------------------------

    const existingResult =
      await client.query(
        `
        SELECT
          id,
          revision_code,
          revision_stage,
          status
        FROM revisions
        WHERE document_id = $1
          AND revision_stage = 'REVIEW'
          AND status <> 'Completed'
        ORDER BY sequence_order DESC, id DESC
        LIMIT 1
        `,
        [document.id]
      );


    if (
      existingResult.rows.length > 0
    ) {

      throw new Error(
        `An active review revision already exists: ${existingResult.rows[0].revision_code}`
      );
    }


    // --------------------------------------------------
    // Generate next review revision
    // --------------------------------------------------

    const reviewRevisionCode =
      await getNextReviewRevision(
        document.id,
        document.project_id,
        client
      );


    // --------------------------------------------------
    // Get next sequence
    // --------------------------------------------------

    const sequenceOrder =
      await getNextSequence(
        document.id,
        client
      );


    // --------------------------------------------------
    // Create REVIEW revision
    // --------------------------------------------------

    const revisionResult =
      await client.query(
        `
        INSERT INTO revisions (
          document_id,
          revision_code,
          revision_stage,
          issue_purpose,
          status,
          sequence_order
        )
        VALUES (
          $1,
          $2,
          'REVIEW',
          'Issued for Review',
          'Submitted',
          $3
        )
        RETURNING *
        `,
        [
          document.id,
          reviewRevisionCode,
          sequenceOrder,
        ]
      );


    const revision =
      revisionResult.rows[0];


    // --------------------------------------------------
    // Create signature workflow
    // --------------------------------------------------

    const signatureSteps =
      await createSignatureWorkflow(
        document.id,
        revision.id,
        document.project_id,
        client
      );


    // --------------------------------------------------
    // Mark customer response as processed
    // --------------------------------------------------

    await client.query(
      `
      UPDATE customer_transmittal_items
      SET
        response_processed = TRUE,
        response_processed_at =
          CURRENT_TIMESTAMP,
        response_action =
          'REVIEW_REVISION_CREATED',
        response_processing_error = NULL
      WHERE id = $1
      `,
      [transmittalItemId]
    );


    await client.query(
      "COMMIT"
    );


    return {
      message:
        "Review revision created successfully",

      transmittal_item: {
        id: item.id,
        customer_document_number:
          item.customer_document_number,
        customer_revision:
          item.customer_revision,
        purpose_code:
          item.purpose_code,
        response_type:
          item.response_type,
      },

      document: {
        id: document.id,
        document_number:
          document.document_number,
        title:
          document.title,
        current_revision_id:
          document.current_revision_id,
      },

      previous_current_revision:
        currentRevision,

      new_review_revision:
        revision,

      signature_workflow:
        signatureSteps,
    };


  } catch (error) {

    await client.query(
      "ROLLBACK"
    );

    throw error;

  } finally {

    client.release();
  }
}


// ======================================================
// EXPORT
// ======================================================

module.exports = {
  getNextReviewRevision,
  createSignatureWorkflow,
  createReviewRevision,
};