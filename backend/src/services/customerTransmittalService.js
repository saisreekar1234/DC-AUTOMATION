const pool = require("../config/database");

const {
  extractPdfText,
  extractTransmittalHeader,
  extractDocumentRows,
} = require("./pdfAnalysisService");


// ======================================================
// 1. SAVE UPLOADED TRANSMITTAL
// ======================================================

async function saveTransmittal(projectId, file) {

  const result = await pool.query(
    `INSERT INTO customer_transmittals (
      project_id,
      file_name,
      file_path,
      analysis_status
    )
    VALUES ($1, $2, $3, $4)
    RETURNING *`,
    [
      projectId,
      file.originalname,
      file.path,
      "UPLOADED",
    ]
  );

  return result.rows[0];
}


// ======================================================
// 2. ANALYSE TRANSMITTAL
// ======================================================

async function analyseTransmittal(transmittalId) {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");


    // --------------------------------------------------
    // Find transmittal
    // --------------------------------------------------

    const transmittalResult = await client.query(
      `SELECT *
       FROM customer_transmittals
       WHERE id = $1`,
      [transmittalId]
    );


    if (transmittalResult.rows.length === 0) {

      throw new Error(
        "Customer transmittal not found"
      );
    }


    const transmittal =
      transmittalResult.rows[0];


    // --------------------------------------------------
    // Extract PDF text
    // --------------------------------------------------

    const pdfResult = await extractPdfText(
      transmittal.file_path
    );


    // --------------------------------------------------
    // Extract header
    // --------------------------------------------------

    const header =
      extractTransmittalHeader(
        pdfResult.text
      );


    // --------------------------------------------------
    // Extract document rows
    // --------------------------------------------------

    const documents =
      extractDocumentRows(
        pdfResult.text
      );


    // --------------------------------------------------
    // Get customer response rules
    // --------------------------------------------------

    const rulesResult = await client.query(
      `SELECT
         response_code,
         response_type,
         description
       FROM customer_response_rules
       WHERE project_id = $1`,
      [transmittal.project_id]
    );


    const responseRules =
      rulesResult.rows;


    // --------------------------------------------------
    // Create lookup:
    //
    // A → APPROVED
    // C → COMMENTED
    // I → INFORMATION
    // --------------------------------------------------

    const responseRuleMap =
      new Map();


    for (const rule of responseRules) {

      responseRuleMap.set(
        rule.response_code,
        rule
      );
    }


    // --------------------------------------------------
    // Remove previous analysis results
    //
    // This allows the same transmittal to be
    // analysed again safely.
    // --------------------------------------------------

    await client.query(
      `DELETE FROM customer_transmittal_items
       WHERE transmittal_id = $1`,
      [transmittalId]
    );


    const savedItems = [];


    // --------------------------------------------------
    // Process every document from PDF
    // --------------------------------------------------

    for (const document of documents) {

      const responseRule =
        responseRuleMap.get(
          document.purpose_code
        );


      // ----------------------------------------------
      // Unknown purpose code
      // ----------------------------------------------

      if (!responseRule) {

        console.warn(
          `Unknown customer response code: ${document.purpose_code}`
        );
      }


      // ----------------------------------------------
      // Find internal document
      //
      // We use the CUSTOMER document number.
      //
      // We do NOT guess if there is no match.
      // ----------------------------------------------

      const documentResult =
        await client.query(
          `SELECT id
           FROM documents
           WHERE project_id = $1
             AND customer_document_number = $2
           LIMIT 1`,
          [
            transmittal.project_id,
            document.document_number,
          ]
        );


      const internalDocumentId =
        documentResult.rows.length > 0
          ? documentResult.rows[0].id
          : null;


      // ----------------------------------------------
      // Build raw extracted row
      // ----------------------------------------------

      const rawText =
        `${document.item_number} ` +
        `${document.document_number} ` +
        `${document.revision} ` +
        `${document.description} ` +
        `${document.quantity_or_nature} ` +
        `${document.purpose_code}`;


      // ----------------------------------------------
      // Save result
      // ----------------------------------------------

      const itemResult =
        await client.query(
          `INSERT INTO customer_transmittal_items (
            transmittal_id,
            document_id,
            customer_document_number,
            customer_revision,
            purpose_code,
            response_type,
            description,
            quantity_or_nature,
            confidence,
            raw_text
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10
          )
          RETURNING *`,
          [
            transmittalId,

            internalDocumentId,

            document.document_number,

            document.revision,

            document.purpose_code,

            responseRule
              ? responseRule.response_type
              : "UNKNOWN",

            document.description,

            document.quantity_or_nature,

            responseRule
              ? 100
              : 0,

            rawText,
          ]
        );


      savedItems.push(
        itemResult.rows[0]
      );
    }


    // --------------------------------------------------
    // Update transmittal metadata
    // --------------------------------------------------

    const updatedResult =
      await client.query(
        `UPDATE customer_transmittals
         SET
           customer_name = $1,
           transmittal_reference = $2,
           transmittal_date = $3::date,
           analysis_status = 'ANALYSED',
           analyzed_at = CURRENT_TIMESTAMP,
           analysis_error = NULL
         WHERE id = $4
         RETURNING
           id,
           project_id,
           file_name,
           file_path,
           customer_name,
           transmittal_reference,
           TO_CHAR(
             transmittal_date,
             'YYYY-MM-DD'
           ) AS transmittal_date,
           analysis_status,
           uploaded_at,
           uploaded_by,
           analyzed_at,
           analysis_error,
           created_at`,
        [
          header.customer_name,

          header.transmittal_reference,

          header.transmittal_date,

          transmittalId,
        ]
      );


    await client.query("COMMIT");


    // --------------------------------------------------
    // Return analysis result
    // --------------------------------------------------

    return {

      transmittal:
        updatedResult.rows[0],

      documents:
        savedItems,

      extracted_header:
        header,

      pages:
        pdfResult.pages,
    };


  } catch (error) {

    await client.query("ROLLBACK");


    // ----------------------------------------------
    // Record failure
    // ----------------------------------------------

    try {

      await pool.query(
        `UPDATE customer_transmittals
         SET
           analysis_status = 'FAILED',
           analysis_error = $1
         WHERE id = $2`,
        [
          error.message,
          transmittalId,
        ]
      );

    } catch (updateError) {

      console.error(
        "Failed to update analysis error:",
        updateError
      );
    }


    throw error;


  } finally {

    client.release();
  }
}


// ======================================================
// 3. GET ALL CUSTOMER TRANSMITTALS
// ======================================================

async function getCustomerTransmittals(
  projectId = null
) {

  let query = `
    SELECT
      ct.id,
      ct.project_id,
      ct.file_name,
      ct.file_path,
      ct.customer_name,
      ct.transmittal_reference,

      TO_CHAR(
        ct.transmittal_date,
        'YYYY-MM-DD'
      ) AS transmittal_date,

      ct.analysis_status,
      ct.uploaded_at,
      ct.uploaded_by,
      ct.analyzed_at,
      ct.analysis_error,
      ct.created_at,

      COUNT(cti.id)::INTEGER AS item_count,

      COUNT(
        CASE
          WHEN cti.document_match_status = 'MATCHED'
          THEN 1
        END
      )::INTEGER AS matched_count,

      COUNT(
        CASE
          WHEN cti.document_match_status = 'UNMATCHED_DOCUMENT'
          THEN 1
        END
      )::INTEGER AS unmatched_count,

      COUNT(
        CASE
          WHEN cti.response_processed = TRUE
          THEN 1
        END
      )::INTEGER AS processed_count

    FROM customer_transmittals ct

    LEFT JOIN customer_transmittal_items cti
      ON cti.transmittal_id = ct.id
  `;


  const values = [];


  if (
    projectId !== null &&
    projectId !== undefined &&
    projectId !== ""
  ) {

    query += `
      WHERE ct.project_id = $1
    `;

    values.push(projectId);
  }


  query += `
    GROUP BY
      ct.id

    ORDER BY
      ct.id DESC
  `;


  const result = await pool.query(
    query,
    values
  );


  return result.rows;
}


// ======================================================
// 4. GET ONE CUSTOMER TRANSMITTAL
// ======================================================

async function getCustomerTransmittalById(
  transmittalId
) {

  const transmittalResult =
    await pool.query(
      `
      SELECT
        id,
        project_id,
        file_name,
        file_path,
        customer_name,
        transmittal_reference,

        TO_CHAR(
          transmittal_date,
          'YYYY-MM-DD'
        ) AS transmittal_date,

        analysis_status,
        uploaded_at,
        uploaded_by,
        analyzed_at,
        analysis_error,
        created_at

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

        cti.internal_revision,
        cti.revision_match_status,
        cti.revision_verified_at,

        cti.document_match_status,

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

    documents:
      itemsResult.rows,
  };
}


// ======================================================
// EXPORT
// ======================================================

module.exports = {
  saveTransmittal,
  analyseTransmittal,
  getCustomerTransmittals,
  getCustomerTransmittalById,
};