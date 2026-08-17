const pool = require("../config/database");


// ======================================================
// VERIFY ONE TRANSMITTAL ITEM
// ======================================================

async function verifyTransmittalItem(itemId) {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    // --------------------------------------------------
    // Get customer item
    // --------------------------------------------------

    const itemResult = await client.query(
      `SELECT
         cti.*,
         ct.project_id
       FROM customer_transmittal_items cti
       JOIN customer_transmittals ct
         ON ct.id = cti.transmittal_id
       WHERE cti.id = $1`,
      [itemId]
    );

    if (itemResult.rows.length === 0) {
      throw new Error(
        "Customer transmittal item not found"
      );
    }

    const item = itemResult.rows[0];


    // --------------------------------------------------
    // No internal document
    // --------------------------------------------------

    if (!item.document_id) {

      const result = await client.query(
        `UPDATE customer_transmittal_items
         SET
           document_match_status = 'UNMATCHED_DOCUMENT',
           internal_revision = NULL,
           revision_match_status = 'NOT_APPLICABLE',
           revision_verified_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [itemId]
      );

      await client.query("COMMIT");

      return result.rows[0];
    }


    // --------------------------------------------------
    // Internal document exists
    // --------------------------------------------------

    const latestRevisionResult =
      await client.query(
        `SELECT
           revision_code,
           revision_stage,
           sequence_order
         FROM revisions
         WHERE document_id = $1
         ORDER BY sequence_order DESC
         LIMIT 1`,
        [item.document_id]
      );


    let latestInternalRevision = null;

    if (latestRevisionResult.rows.length > 0) {
      latestInternalRevision =
        latestRevisionResult.rows[0].revision_code;
    }


    // --------------------------------------------------
    // IMPORTANT:
    //
    // Customer revision is independent from
    // internal revision.
    //
    // Therefore we do NOT compare:
    //
    // customer_revision === revision_code
    // --------------------------------------------------

    const result = await client.query(
      `UPDATE customer_transmittal_items
       SET
         document_match_status = 'MATCHED',
         internal_revision = $1,
         revision_match_status = 'NOT_APPLICABLE',
         revision_verified_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [
        latestInternalRevision,
        itemId,
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
// VERIFY ENTIRE TRANSMITTAL
// ======================================================

async function verifyTransmittal(transmittalId) {

  const itemsResult = await pool.query(
    `SELECT id
     FROM customer_transmittal_items
     WHERE transmittal_id = $1
     ORDER BY id ASC`,
    [transmittalId]
  );


  const results = [];


  for (const item of itemsResult.rows) {

    const verified =
      await verifyTransmittalItem(
        item.id
      );

    results.push(verified);
  }


  return results;
}


module.exports = {
  verifyTransmittalItem,
  verifyTransmittal,
};