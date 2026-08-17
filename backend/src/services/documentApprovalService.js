const pool = require("../config/database");


// ======================================================
// CHECK SIGNATURE COMPLETION
// ======================================================

async function checkSignatureCompletion(
  revisionId,
  client = pool
) {

  const result = await client.query(
    `
    SELECT
      id,
      document_id,
      revision_id,
      signature_role,
      signature_required,
      signature_status,
      signed_by,
      signature_id,
      signed_at
    FROM document_signatures
    WHERE revision_id = $1
    ORDER BY id
    `,
    [revisionId]
  );

  const signatures = result.rows;


  if (signatures.length === 0) {

    return {
      complete: false,

      message:
        "No signature workflow exists for this revision",

      signatures: [],

      incomplete_signatures: [],
    };
  }


  const incomplete =
    signatures.filter(
      (signature) =>
        signature.signature_required === true &&
        signature.signature_status !== "SIGNED"
    );


  return {

    complete:
      incomplete.length === 0,

    message:
      incomplete.length === 0
        ? "All required signatures are completed"
        : "Required signatures are still pending",

    signatures,

    incomplete_signatures:
      incomplete.map(
        (signature) => ({
          id: signature.id,
          role: signature.signature_role,
          status: signature.signature_status,
        })
      ),
  };
}


// ======================================================
// GET PROJECT REVISION RULE
// ======================================================

async function getProjectRevisionRule(
  projectId,
  client = pool
) {

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
// GET NEXT APPROVED REVISION NUMBER
// ======================================================

async function getNextApprovedRevision(
  documentId,
  projectId,
  reviewRevision,
  client
) {

  const rule =
    await getProjectRevisionRule(
      projectId,
      client
    );


  if (!rule) {

    throw new Error(
      "No revision rule configured for this project"
    );
  }


  if (!rule.approved_revision_start) {

    throw new Error(
      "Approved revision start is not configured"
    );
  }


  // ----------------------------------------------------
  // Get existing approved revisions
  // ----------------------------------------------------

  const result =
    await client.query(
      `
      SELECT
        revision_code
      FROM revisions
      WHERE document_id = $1
        AND revision_stage = 'APPROVED'
      ORDER BY sequence_order DESC, id DESC
      `,
      [documentId]
    );


  const approvedRevisions =
    result.rows.map(
      (row) => row.revision_code
    );


  // ====================================================
  // NUMBER PATTERN
  // ====================================================

  if (
    rule.approved_revision_pattern ===
    "NUMBER"
  ) {

    let nextNumber =
      Number(
        rule.approved_revision_start
      );


    if (Number.isNaN(nextNumber)) {

      throw new Error(
        "Invalid approved revision start number"
      );
    }


    if (
      approvedRevisions.length > 0
    ) {

      const numericRevisions =
        approvedRevisions
          .map(Number)
          .filter(
            (value) =>
              !Number.isNaN(value)
          );


      if (
        numericRevisions.length > 0
      ) {

        nextNumber =
          Math.max(
            ...numericRevisions
          ) + 1;
      }
    }


    return String(nextNumber);
  }


  // ====================================================
  // LETTER PATTERN
  // ====================================================

  if (
    rule.approved_revision_pattern ===
    "LETTER"
  ) {

    let nextLetter =
      rule.approved_revision_start
        .toUpperCase();


    if (
      approvedRevisions.length > 0
    ) {

      const letters =
        approvedRevisions.filter(
          (value) =>
            /^[A-Z]+$/.test(value)
        );


      if (letters.length > 0) {

        const last =
          letters.sort().pop();


        nextLetter =
          String.fromCharCode(
            last.charCodeAt(0) + 1
          );
      }
    }


    return nextLetter;
  }


  throw new Error(
    `Unsupported approved revision pattern: ${rule.approved_revision_pattern}`
  );
}


// ======================================================
// GET NEXT SEQUENCE ORDER
// ======================================================

async function getNextSequenceOrder(
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
// PROMOTE REVIEW REVISION
// ======================================================

async function promoteRevision(
  revisionId
) {

  const client =
    await pool.connect();


  try {

    await client.query("BEGIN");


    // ==================================================
    // 1. LOCK REVIEW REVISION + DOCUMENT
    // ==================================================

    const revisionResult =
      await client.query(
        `
        SELECT
          r.*,
          d.project_id,
          d.document_number,
          d.title,
          d.current_revision_id
        FROM revisions r
        INNER JOIN documents d
          ON d.id = r.document_id
        WHERE r.id = $1
        FOR UPDATE OF r, d
        `,
        [revisionId]
      );


    if (
      revisionResult.rows.length === 0
    ) {

      throw new Error(
        "Revision not found"
      );
    }


    const revision =
      revisionResult.rows[0];


    // ==================================================
    // 2. ONLY REVIEW REVISIONS CAN BE PROMOTED
    // ==================================================

    if (
      revision.revision_stage !==
      "REVIEW"
    ) {

      throw new Error(
        "Only REVIEW revisions can be promoted"
      );
    }


    // ==================================================
    // 3. PREVENT DUPLICATE PROMOTION
    // ==================================================

    if (
      revision.promoted_to_revision_id
    ) {

      throw new Error(
        `This revision has already been promoted to revision ${revision.promoted_to_revision_id}`
      );
    }


    if (
      revision.status === "Completed"
    ) {

      throw new Error(
        "This revision has already been completed and promoted"
      );
    }


    // ==================================================
    // 4. CHECK SIGNATURES
    // ==================================================

    const signatureStatus =
      await checkSignatureCompletion(
        revisionId,
        client
      );


    if (
      !signatureStatus.complete
    ) {

      const roles =
        signatureStatus
          .incomplete_signatures
          .map(
            (item) =>
              `${item.role} (${item.status})`
          )
          .join(", ");


      throw new Error(
        `Cannot promote revision. Required signatures are incomplete: ${roles}`
      );
    }


    // ==================================================
    // 5. GET PROJECT REVISION RULE
    // ==================================================

    const rule =
      await getProjectRevisionRule(
        revision.project_id,
        client
      );


    if (!rule) {

      throw new Error(
        "No revision rule configured for this project"
      );
    }


    // ==================================================
    // 6. VERIFY CURRENT DOCUMENT REVISION
    // ==================================================

    if (
      !revision.current_revision_id
    ) {

      throw new Error(
        "Document does not have a current revision"
      );
    }


    const currentRevisionResult =
      await client.query(
        `
        SELECT
          id,
          document_id,
          revision_code,
          revision_stage,
          status,
          sequence_order
        FROM revisions
        WHERE id = $1
          AND document_id = $2
        FOR UPDATE
        `,
        [
          revision.current_revision_id,
          revision.document_id,
        ]
      );


    if (
      currentRevisionResult.rows.length === 0
    ) {

      throw new Error(
        "Current document revision could not be found"
      );
    }


    const currentRevision =
      currentRevisionResult.rows[0];


    // ==================================================
    // 7. CHECK WHETHER THIS REVIEW WAS ALREADY
    //    PROMOTED BUT THE LINK WAS NOT CREATED
    // ==================================================

    const existingApprovedResult =
      await client.query(
        `
        SELECT
          id,
          revision_code,
          revision_stage,
          issue_purpose,
          status,
          sequence_order
        FROM revisions
        WHERE document_id = $1
          AND revision_stage = 'APPROVED'
          AND sequence_order > $2
        ORDER BY sequence_order ASC
        LIMIT 1
        `,
        [
          revision.document_id,
          revision.sequence_order,
        ]
      );


    if (
      existingApprovedResult.rows.length > 0
    ) {

      const existingApproved =
        existingApprovedResult.rows[0];


      throw new Error(
        `An approved revision (${existingApproved.revision_code}) already exists after this review revision`
      );
    }


    // ==================================================
    // 8. GET NEXT APPROVED REVISION
    // ==================================================

    const approvedRevisionCode =
      await getNextApprovedRevision(
        revision.document_id,
        revision.project_id,
        revision.revision_code,
        client
      );


    // ==================================================
    // 9. GET NEXT SEQUENCE
    // ==================================================

    const sequenceOrder =
      await getNextSequenceOrder(
        revision.document_id,
        client
      );


    // ==================================================
    // 10. CREATE APPROVED REVISION
    // ==================================================

    const approvedRevisionResult =
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
          'APPROVED',
          'Issued for Use',
          'Completed',
          $3
        )
        RETURNING *
        `,
        [
          revision.document_id,
          approvedRevisionCode,
          sequenceOrder,
        ]
      );


    const approvedRevision =
      approvedRevisionResult.rows[0];


    // ==================================================
    // 11. COMPLETE REVIEW REVISION AND LINK IT TO
    //     THE APPROVED REVISION
    // ==================================================

    const completedRevisionResult =
      await client.query(
        `
        UPDATE revisions
        SET
          status = 'Completed',
          promoted_to_revision_id = $1
        WHERE id = $2
          AND revision_stage = 'REVIEW'
          AND status <> 'Completed'
          AND promoted_to_revision_id IS NULL
        RETURNING *
        `,
        [
          approvedRevision.id,
          revisionId,
        ]
      );


    if (
      completedRevisionResult.rows.length === 0
    ) {

      throw new Error(
        "Review revision was already completed or promoted"
      );
    }


    const completedRevision =
      completedRevisionResult.rows[0];


    // ==================================================
    // 12. UPDATE DOCUMENT CURRENT REVISION
    // ==================================================

    const documentResult =
      await client.query(
        `
        UPDATE documents
        SET
          current_revision_id = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING
          id,
          document_number,
          title,
          project_id,
          current_revision_id
        `,
        [
          approvedRevision.id,
          revision.document_id,
        ]
      );


    if (
      documentResult.rows.length === 0
    ) {

      throw new Error(
        "Failed to update document current revision"
      );
    }


    // ==================================================
    // 13. COMMIT
    // ==================================================

    await client.query("COMMIT");


    // ==================================================
    // 14. RETURN RESULT
    // ==================================================

    return {

      message:
        "Revision promoted successfully",

      previous_revision:
        completedRevision,

      approved_revision:
        approvedRevision,

      document:
        documentResult.rows[0],

      signatures:
        signatureStatus.signatures,

      revision_rule:
        rule,
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
// GET REVISION APPROVAL STATUS
// ======================================================

async function getRevisionApprovalStatus(
  revisionId
) {

  const revisionResult =
    await pool.query(
      `
      SELECT
        r.*,
        d.document_number,
        d.title,
        d.project_id
      FROM revisions r
      INNER JOIN documents d
        ON d.id = r.document_id
      WHERE r.id = $1
      `,
      [revisionId]
    );


  if (
    revisionResult.rows.length === 0
  ) {

    throw new Error(
      "Revision not found"
    );
  }


  const revision =
    revisionResult.rows[0];


  const signatureStatus =
    await checkSignatureCompletion(
      revisionId
    );


  return {

    revision,

    signatures:
      signatureStatus.signatures,

    signatures_complete:
      signatureStatus.complete,

    message:
      signatureStatus.message,

    incomplete_signatures:
      signatureStatus.incomplete_signatures,
  };
}


// ======================================================
// EXPORT
// ======================================================

module.exports = {

  checkSignatureCompletion,

  getProjectRevisionRule,

  getNextApprovedRevision,

  promoteRevision,

  getRevisionApprovalStatus,
};