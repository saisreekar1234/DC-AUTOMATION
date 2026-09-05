const customerResponseService =
  require("../services/customerResponseService");

const projectMemberService =
  require("../services/projectMemberService");


// ======================================================
// HELPERS
// ======================================================

function isAdmin(req) {

  return String(
    req.user?.role || ""
  ).toLowerCase() === "admin";
}


async function ensureProjectAccess(
  req,
  res,
  projectId
) {

  if (isAdmin(req)) {
    return true;
  }


  const access =
    await projectMemberService.hasProjectAccess(
      projectId,
      req.user.user_id
    );


  if (!access) {

    res.status(403).json({
      message:
        "You do not have access to this project",
    });

    return false;
  }


  return true;
}


// ======================================================
// GET PROJECT ID FROM TRANSMITTAL
// ======================================================

async function getTransmittalProjectId(
  transmittalId
) {

  const pool =
    require("../config/database");


  const result =
    await pool.query(
      `
        SELECT project_id
        FROM customer_transmittals
        WHERE id = $1
        LIMIT 1
      `,
      [transmittalId]
    );


  if (
    result.rows.length === 0
  ) {

    const error =
      new Error(
        "Customer transmittal not found"
      );

    error.statusCode = 404;

    throw error;
  }


  return result.rows[0].project_id;
}


// ======================================================
// GET PROJECT ID FROM CUSTOMER RESPONSE ITEM
// ======================================================

async function getItemProjectId(
  itemId
) {

  const pool =
    require("../config/database");


  const result =
    await pool.query(
      `
        SELECT
          ct.project_id
        FROM customer_transmittal_items cti
        INNER JOIN customer_transmittals ct
          ON ct.id = cti.transmittal_id
        WHERE cti.id = $1
        LIMIT 1
      `,
      [itemId]
    );


  if (
    result.rows.length === 0
  ) {

    const error =
      new Error(
        "Customer transmittal item not found"
      );

    error.statusCode = 404;

    throw error;
  }


  return result.rows[0].project_id;
}


// ======================================================
// 1. PROCESS ONE CUSTOMER RESPONSE
// ======================================================

async function processCustomerResponse(
  req,
  res
) {

  try {

    const projectId =
      await getItemProjectId(
        req.params.itemId
      );


    if (
      !(await ensureProjectAccess(
        req,
        res,
        projectId
      ))
    ) {
      return;
    }


    const result =
      await customerResponseService
        .processCustomerResponse(
          req.params.itemId
        );


    res.json(result);


  } catch (error) {

    console.error(error);


    const status =
      error.statusCode || 500;


    res.status(status).json({
      message:
        error.message ||
        "Failed to process customer response",
    });
  }
}


// ======================================================
// 2. PROCESS ENTIRE TRANSMITTAL
// ======================================================

async function processCustomerTransmittal(
  req,
  res
) {

  try {

    const projectId =
      await getTransmittalProjectId(
        req.params.transmittalId
      );


    if (
      !(await ensureProjectAccess(
        req,
        res,
        projectId
      ))
    ) {
      return;
    }


    const results =
      await customerResponseService
        .processCustomerTransmittal(
          req.params.transmittalId
        );


    res.json({

      transmittal_id:
        Number(
          req.params.transmittalId
        ),

      count:
        results.length,

      items:
        results,
    });


  } catch (error) {

    console.error(error);


    const status =
      error.statusCode || 500;


    res.status(status).json({

      message:
        error.message ||
        "Failed to process customer transmittal",
    });
  }
}


// ======================================================
// 3. GET CUSTOMER RESPONSES FOR TRANSMITTAL
// ======================================================

async function getCustomerResponsesByTransmittal(
  req,
  res
) {

  try {

    const projectId =
      await getTransmittalProjectId(
        req.params.transmittalId
      );


    if (
      !(await ensureProjectAccess(
        req,
        res,
        projectId
      ))
    ) {
      return;
    }


    const result =
      await customerResponseService
        .getCustomerResponsesByTransmittal(
          req.params.transmittalId
        );


    res.json(result);


  } catch (error) {

    console.error(error);


    const status =
      error.statusCode || 500;


    res.status(status).json({

      message:
        error.message ||
        "Failed to fetch customer responses",
    });
  }
}


// ======================================================
// 4. GET ONE CUSTOMER RESPONSE
// ======================================================

async function getCustomerResponseById(
  req,
  res
) {

  try {

    const projectId =
      await getItemProjectId(
        req.params.itemId
      );


    if (
      !(await ensureProjectAccess(
        req,
        res,
        projectId
      ))
    ) {
      return;
    }


    const result =
      await customerResponseService
        .getCustomerResponseById(
          req.params.itemId
        );


    res.json(result);


  } catch (error) {

    console.error(error);


    const status =
      error.statusCode || 500;


    res.status(status).json({

      message:
        error.message ||
        "Failed to fetch customer response",
    });
  }
}


// ======================================================
// 5. MAP CUSTOMER RESPONSE TO INTERNAL DOCUMENT
// ======================================================

async function mapCustomerResponseToDocument(
  req,
  res
) {

  try {

    const projectId =
      await getItemProjectId(
        req.params.itemId
      );


    if (
      !(await ensureProjectAccess(
        req,
        res,
        projectId
      ))
    ) {
      return;
    }


    const documentId =
      Number(
        req.body?.document_id
      );


    if (
      !Number.isInteger(documentId) ||
      documentId <= 0
    ) {

      return res.status(400).json({
        message:
          "A valid document_id is required",
      });
    }


    const result =
      await customerResponseService
        .mapCustomerResponseToDocument(
          req.params.itemId,
          documentId
        );


    res.json(result);


  } catch (error) {

    console.error(error);


    const status =
      error.statusCode || 500;


    res.status(status).json({

      message:
        error.message ||
        "Failed to map customer response",
    });
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
