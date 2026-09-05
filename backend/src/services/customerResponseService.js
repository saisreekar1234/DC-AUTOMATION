const pool = require("../config/database");

const {
  createReviewRevision,
} = require("./revisionWorkflowService");


// ======================================================
// 1. PROCESS ONE CUSTOMER RESPONSE
// ======================================================

async function processCustomerResponse(itemId) {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");


    // --------------------------------------------------
    // Lock customer response
    // --------------------------------------------------

    const itemResult =
      await client.query(
        `
        SELECT
          cti.*,
          ct.project_id
        FROM customer_transmittal_items cti
        INNER JOIN customer_transmittals ct
          ON ct.id = cti.transmittal_id
        WHERE cti.id = $1
        FOR UPDATE
        `,
        [itemId]
      );


    if (itemResult.rows.length === 0) {

      throw new Error(
        "Customer transmittal item not found"
      );
    }


    const item =
      itemResult.rows[0];


    // --------------------------------------------------
    // Already processed
    // --------------------------------------------------

    if (item.response_processed) {

      await client.query("COMMIT");

      return item;
    }


    // --------------------------------------------------
    // Document must be matched
    // --------------------------------------------------

    if (
      !item.document_id ||
      item.document_match_status !== "MATCHED"
    ) {

      const result =
        await client.query(
          `
          UPDATE customer_transmittal_items
          SET
            response_processed = FALSE,
            response_action =
              'BLOCKED_UNMATCHED_DOCUMENT',
            response_processing_error =
              'Customer document is not mapped to an internal document'
          WHERE id = $1
          RETURNING *
          `,
          [itemId]
        );


      await client.query("COMMIT");

      return result.rows[0];
    }


    // --------------------------------------------------
    // Response type validation
    // --------------------------------------------------

    const allowedResponses = [
      "APPROVED",
      "COMMENTED",
      "INFORMATION",
    ];


    if (
      !allowedResponses.includes(
        item.response_type
      )
    ) {

      throw new Error(
        `Unsupported response type: ${item.response_type}`
      );
    }


    // ==================================================
    // CUSTOMER APPROVED
    // ==================================================

    if (
      item.response_type === "APPROVED"
    ) {

      /*
       * Customer revision and internal revision
       * are independent.
       *
       * Example:
       *
       * Customer revision 04
       *        ↓
       * Internal revision 0
       *
       * Customer revision 05
       *        ↓
       * Internal revision 1
       *
       * Every new customer APPROVED response
       * creates the next internal APPROVED revision.
       */


      // ------------------------------------------------
      // Get project revision rule
      // ------------------------------------------------

      const ruleResult =
        await client.query(
          `
          SELECT
            id,
            project_id,
            rule_name,
            approved_revision_start,
            approved_revision_pattern
          FROM project_revision_rules
          WHERE project_id = $1
          ORDER BY id ASC
          LIMIT 1
          `,
          [item.project_id]
        );


      if (
        ruleResult.rows.length === 0
      ) {

        throw new Error(
          "No revision rule configured for this project"
        );
      }


      const rule =
        ruleResult.rows[0];


      // ------------------------------------------------
      // Get existing APPROVED revisions
      // ------------------------------------------------

      const approvedResult =
        await client.query(
          `
          SELECT
            revision_code
          FROM revisions
          WHERE document_id = $1
            AND revision_stage = 'APPROVED'
          ORDER BY sequence_order DESC, id DESC
          `,
          [item.document_id]
        );


      const approvedRevisions =
        approvedResult.rows.map(
          row => row.revision_code
        );


      // ------------------------------------------------
      // Calculate next APPROVED revision
      // ------------------------------------------------

      let nextRevision;


      if (
        rule.approved_revision_pattern ===
        "NUMBER"
      ) {

        let nextNumber =
          Number(
            rule.approved_revision_start
          );


        if (
          Number.isNaN(nextNumber)
        ) {

          throw new Error(
            "Invalid approved revision start number"
          );
        }


        const numericRevisions =
          approvedRevisions
            .map(Number)
            .filter(
              value =>
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


        nextRevision =
          String(nextNumber);


      } else if (
        rule.approved_revision_pattern ===
        "LETTER"
      ) {

        let nextLetter =
          rule.approved_revision_start
            .toUpperCase();


        const letters =
          approvedRevisions.filter(
            value =>
              /^[A-Z]+$/.test(value)
          );


        if (
          letters.length > 0
        ) {

          const last =
            letters.sort().pop();


          let number = 0;


          for (
            const character of last
          ) {

            number =
              number * 26 +
              (
                character.charCodeAt(0)
                - 64
              );
          }


          number++;


          let result = "";


          while (
            number > 0
          ) {

            number--;

            result =
              String.fromCharCode(
                65 +
                (number % 26)
              ) + result;

            number =
              Math.floor(
                number / 26
              );
          }


          nextLetter =
            result;
        }


        nextRevision =
          nextLetter;


      } else {

        throw new Error(
          `Unsupported approved revision pattern: ${rule.approved_revision_pattern}`
        );
      }


      // ------------------------------------------------
      // Get next sequence order
      // ------------------------------------------------

      const sequenceResult =
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
          [item.document_id]
        );


      const sequenceOrder =
        Number(
          sequenceResult.rows[0]
            .next_sequence
        );


      // ------------------------------------------------
      // Create APPROVED revision
      // ------------------------------------------------

      const revisionResult =
        await client.query(
          `
          INSERT INTO revisions (
            document_id,
            revision_code,
            revision_stage,
            issue_purpose,
            status,
            reason_for_issue,
            revision_date,
            sequence_order
          )
          VALUES (
            $1,
            $2,
            'APPROVED',
            'Issued for Use',
            'Completed',
            $3,
            CURRENT_DATE,
            $4
          )
          RETURNING *
          `,
          [
            item.document_id,
            nextRevision,
            `Customer approved document ${item.customer_document_number} at customer revision ${item.customer_revision}`,
            sequenceOrder,
          ]
        );


      const createdRevision =
        revisionResult.rows[0];


      // ------------------------------------------------
      // Make new APPROVED revision current
      // ------------------------------------------------

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
            createdRevision.id,
            item.document_id,
          ]
        );


      if (
        documentResult.rows.length === 0
      ) {

        throw new Error(
          "Failed to update document current revision"
        );
      }


      // ------------------------------------------------
      // Mark customer response processed
      //
      // IMPORTANT:
      // internal_revision is the newly created
      // internal APPROVED revision.
      // ------------------------------------------------

      const result =
        await client.query(
          `
          UPDATE customer_transmittal_items
          SET
            internal_revision = $1,
            response_processed = TRUE,
            response_processed_at =
              CURRENT_TIMESTAMP,
            response_action =
              'CUSTOMER_APPROVED',
            response_processing_error = NULL
          WHERE id = $2
          RETURNING *
          `,
          [
            createdRevision.revision_code,
            itemId,
          ]
        );


      await client.query("COMMIT");


      return {

        ...result.rows[0],

        created_revision:
          createdRevision,

        document:
          documentResult.rows[0],
      };
    }


    // ==================================================
    // CUSTOMER COMMENTED
    // ==================================================

    if (
      item.response_type === "COMMENTED"
    ) {

      /*
       * The revision workflow service owns the
       * creation of the internal REVIEW revision.
       *
       * It will:
       *
       * 1. Verify the document is mapped.
       * 2. Verify the current revision is APPROVED.
       * 3. Determine the next REVIEW revision.
       * 4. Create the REVIEW revision.
       * 5. Create PREPARED_BY / CHECKED_BY /
       *    APPROVED_BY signature workflow.
       * 6. Keep the existing approved revision
       *    as current.
       */


      await client.query("COMMIT");


      /*
       * The revision workflow service creates
       * its own transaction, so we call it after
       * committing the current transaction.
       */

      try {

        const workflow =
          await createReviewRevision(
            itemId
          );


        // ----------------------------------------------
        // Fetch final customer response row
        // ----------------------------------------------

        const result =
          await pool.query(
            `
            SELECT *
            FROM customer_transmittal_items
            WHERE id = $1
            `,
            [itemId]
          );


        return {

          ...result.rows[0],

          created_revision:
            workflow.new_review_revision,

          signature_workflow:
            workflow.signature_workflow,
        };


      } catch (error) {

        /*
         * If review revision creation fails,
         * record the failure on the customer item.
         */

        await pool.query(
          `
          UPDATE customer_transmittal_items
          SET
            response_processed = FALSE,
            response_action =
              'PROCESSING_ERROR',
            response_processing_error = $2
          WHERE id = $1
          `,
          [
            itemId,
            error.message,
          ]
        );


        throw error;
      }
    }


    // ==================================================
    // CUSTOMER INFORMATION
    // ==================================================

    if (
      item.response_type === "INFORMATION"
    ) {

      const result =
        await client.query(
          `
          UPDATE customer_transmittal_items
          SET
            response_processed = TRUE,
            response_processed_at =
              CURRENT_TIMESTAMP,
            response_action =
              'CUSTOMER_INFORMATION',
            response_processing_error = NULL
          WHERE id = $1
          RETURNING *
          `,
          [itemId]
        );


      await client.query("COMMIT");


      return result.rows[0];
    }


  } catch (error) {

    /*
     * Only rollback if the transaction is still open.
     */

    try {

      await client.query("ROLLBACK");

    } catch (rollbackError) {

      console.error(
        "Rollback error:",
        rollbackError
      );
    }


    throw error;


  } finally {

    client.release();
  }
}


// ======================================================
// 2. PROCESS ENTIRE TRANSMITTAL
// ======================================================

async function processCustomerTransmittal(
  transmittalId
) {

  const itemsResult =
    await pool.query(
      `
      SELECT id
      FROM customer_transmittal_items
      WHERE transmittal_id = $1
      ORDER BY id ASC
      `,
      [transmittalId]
    );


  const results = [];


  for (
    const item of itemsResult.rows
  ) {

    try {

      const result =
        await processCustomerResponse(
          item.id
        );


      results.push(result);


    } catch (error) {

      results.push({

        item_id:
          item.id,

        response_processed:
          false,

        response_action:
          "PROCESSING_ERROR",

        response_processing_error:
          error.message,
      });
    }
  }


  return results;
}


// ======================================================
// 3. GET CUSTOMER RESPONSES FOR TRANSMITTAL
// ======================================================

async function getCustomerResponsesByTransmittal(
  transmittalId
) {

  const transmittalResult =
    await pool.query(
      `
      SELECT
        id,
        project_id,
        customer_name,
        transmittal_reference,
        TO_CHAR(
          transmittal_date,
          'YYYY-MM-DD'
        ) AS transmittal_date,
        analysis_status,
        uploaded_at,
        analyzed_at
      FROM customer_transmittals
      WHERE id = $1
      `,
      [transmittalId]
    );


  if (
    transmittalResult.rows.length === 0
  ) {

    throw new Error(
      "Customer transmittal not found"
    );
  }


  const itemsResult =
    await pool.query(
      `
      SELECT

        cti.id,
        cti.transmittal_id,

        cti.document_id,

        cti.customer_document_number,
        cti.customer_revision,

        cti.purpose_code,
        cti.response_type,

        cti.description,
        cti.quantity_or_nature,

        cti.confidence,
        cti.raw_text,

        cti.document_match_status,

        cti.internal_revision,
        cti.revision_match_status,
        cti.revision_verified_at,

        cti.response_processed,
        cti.response_processed_at,

        cti.response_action,
        cti.response_processing_error,

        cti.created_at

      FROM customer_transmittal_items cti

      WHERE cti.transmittal_id = $1

      ORDER BY
        cti.id ASC
      `,
      [transmittalId]
    );


  return {

    transmittal:
      transmittalResult.rows[0],

    count:
      itemsResult.rows.length,

    responses:
      itemsResult.rows,
  };
}


// ======================================================
// 4. GET ONE CUSTOMER RESPONSE
// ======================================================

async function getCustomerResponseById(
  itemId
) {

  const result =
    await pool.query(
      `
      SELECT

        cti.id,
        cti.transmittal_id,

        cti.document_id,

        cti.customer_document_number,
        cti.customer_revision,

        cti.purpose_code,
        cti.response_type,

        cti.description,
        cti.quantity_or_nature,

        cti.confidence,
        cti.raw_text,

        cti.document_match_status,

        cti.internal_revision,
        cti.revision_match_status,
        cti.revision_verified_at,

        cti.response_processed,
        cti.response_processed_at,

        cti.response_action,
        cti.response_processing_error,

        cti.created_at,

        ct.project_id,
        ct.customer_name,
        ct.transmittal_reference,

        TO_CHAR(
          ct.transmittal_date,
          'YYYY-MM-DD'
        ) AS transmittal_date,

        d.document_number AS internal_document_number,
        d.title AS internal_document_title,
        d.current_revision_id,

        r.revision_code AS current_revision_code,
        r.revision_stage AS current_revision_stage,
        r.issue_purpose AS current_revision_issue_purpose,
        r.status AS current_revision_status

      FROM customer_transmittal_items cti

      INNER JOIN customer_transmittals ct
        ON ct.id = cti.transmittal_id

      LEFT JOIN documents d
        ON d.id = cti.document_id

      LEFT JOIN revisions r
        ON r.id = d.current_revision_id

      WHERE cti.id = $1
      `,
      [itemId]
    );


  if (
    result.rows.length === 0
  ) {

    throw new Error(
      "Customer transmittal item not found"
    );
  }


  return result.rows[0];
}



// ======================================================
// 5. MAP CUSTOMER RESPONSE TO INTERNAL DOCUMENT
// ======================================================

async function mapCustomerResponseToDocument(
  itemId,
  documentId
) {

  const client =
    await pool.connect();

  try {

    await client.query("BEGIN");

    const itemResult =
      await client.query(
        `
          SELECT
            cti.id,
            cti.transmittal_id,
            cti.document_id,
            ct.project_id
          FROM customer_transmittal_items cti
          INNER JOIN customer_transmittals ct
            ON ct.id = cti.transmittal_id
          WHERE cti.id = $1
          FOR UPDATE
        `,
        [itemId]
      );

    if (
      itemResult.rows.length === 0
    ) {

      const error =
        new Error(
          "Customer transmittal item not found"
        );

      error.statusCode = 404;

      throw error;
    }

    const item =
      itemResult.rows[0];

    if (
      item.document_id &&
      item.document_id !== Number(documentId)
    ) {

      const error =
        new Error(
          "This customer response is already mapped to an internal document"
        );

      error.statusCode = 409;

      throw error;
    }

    const documentResult =
      await client.query(
        `
          SELECT
            id,
            project_id,
            document_number,
            title
          FROM documents
          WHERE id = $1
            AND is_active = TRUE
          LIMIT 1
        `,
        [documentId]
      );

    if (
      documentResult.rows.length === 0
    ) {

      const error =
        new Error(
          "Internal document not found"
        );

      error.statusCode = 404;

      throw error;
    }

    const document =
      documentResult.rows[0];

    if (
      Number(document.project_id) !==
      Number(item.project_id)
    ) {

      const error =
        new Error(
          "Internal document does not belong to this project"
        );

      error.statusCode = 400;

      throw error;
    }

    const result =
      await client.query(
        `
          UPDATE customer_transmittal_items
          SET
            document_id = $1,
            document_match_status = 'MATCHED',
            response_processing_error = NULL
          WHERE id = $2
          RETURNING *
        `,
        [
          document.id,
          itemId,
        ]
      );

    await client.query("COMMIT");

    return {
      ...result.rows[0],
      internal_document:
        document,
    };

  } catch (error) {

    try {

      await client.query(
        "ROLLBACK"
      );

    } catch (rollbackError) {

      console.error(
        "Rollback error:",
        rollbackError
      );
    }

    throw error;

  } finally {

    client.release();
  }
}

// ======================================================
// EXPORT
// ======================================================

module.exports = {

  processCustomerResponse,

  processCustomerTransmittal,

  getCustomerResponsesByTransmittal,

  getCustomerResponseById,

  mapCustomerResponseToDocument,
};
