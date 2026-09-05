const customerTransmittalService =
  require("../services/customerTransmittalService");

const projectMemberService =
  require("../services/projectMemberService");

function isAdmin(req) {
  return String(req.user?.role || "").toLowerCase() === "admin";
}

async function ensureProjectAccess(req, res, projectId) {
  if (isAdmin(req)) return true;

  const access = await projectMemberService.hasProjectAccess(
    projectId,
    req.user.user_id
  );

  if (!access) {
    res.status(403).json({
      message: "You do not have access to this project",
    });
    return false;
  }

  return true;
}


// ======================================================
// 1. UPLOAD CUSTOMER TRANSMITTAL
// ======================================================

async function uploadTransmittal(req, res) {

  try {

    if (!req.file) {

      return res.status(400).json({
        message:
          "Please upload a PDF transmittal",
      });
    }


    const projectId =
      req.body.project_id;


    if (!projectId) {

      return res.status(400).json({
        message:
          "project_id is required",
      });
    }

    if (!(await ensureProjectAccess(req, res, projectId))) {
      return;
    }


    const transmittal =
      await customerTransmittalService
        .saveTransmittal(
          projectId,
          req.file
        );


    res.status(201).json({

      message:
        "Customer transmittal uploaded successfully",

      transmittal,
    });


  } catch (error) {

    console.error(error);


    res.status(500).json({

      message:
        error.message ||
        "Failed to upload customer transmittal",
    });
  }
}


// ======================================================
// 2. ANALYSE CUSTOMER TRANSMITTAL
// ======================================================

async function analyseTransmittal(
  req,
  res
) {

  try {

    const existing =
      await customerTransmittalService
        .getCustomerTransmittalById(
          req.params.id
        );

    const transmittal =
      existing.transmittal || existing;

    if (!(await ensureProjectAccess(req, res, transmittal.project_id))) {
      return;
    }

    const result =
      await customerTransmittalService
        .analyseTransmittal(
          req.params.id
        );


    res.json(result);


  } catch (error) {

    console.error(error);


    res.status(500).json({

      message:
        error.message ||
        "Failed to analyse transmittal",
    });
  }
}


// ======================================================
// 3. GET ALL CUSTOMER TRANSMITTALS
// ======================================================

async function getCustomerTransmittals(
  req,
  res
) {

  try {

    const projectId =
      req.query.project_id;

    let transmittals;

    if (isAdmin(req)) {
      transmittals =
        await customerTransmittalService
          .getCustomerTransmittals(projectId);
    } else if (projectId) {
      if (!(await ensureProjectAccess(req, res, projectId))) {
        return;
      }

      transmittals =
        await customerTransmittalService
          .getCustomerTransmittals(projectId);
    } else {
      transmittals =
        await customerTransmittalService
          .getCustomerTransmittalsForUser(req.user.user_id);
    }


    res.json(
      transmittals
    );


  } catch (error) {

    console.error(error);


    res.status(500).json({

      message:
        error.message ||
        "Failed to fetch customer transmittals",
    });
  }
}


// ======================================================
// 4. GET ONE CUSTOMER TRANSMITTAL
// ======================================================

async function getCustomerTransmittalById(
  req,
  res
) {

  try {

    const result =
      await customerTransmittalService
        .getCustomerTransmittalById(
          req.params.id
        );

    const transmittal =
      result.transmittal || result;

    if (!(await ensureProjectAccess(req, res, transmittal.project_id))) {
      return;
    }


    res.json(result);


  } catch (error) {

    console.error(error);


    if (
      error.message ===
      "Customer transmittal not found"
    ) {

      return res.status(404).json({
        message: error.message,
      });
    }


    res.status(500).json({

      message:
        error.message ||
        "Failed to fetch customer transmittal",
    });
  }
}


// ======================================================
// EXPORT
// ======================================================

module.exports = {

  uploadTransmittal,

  analyseTransmittal,

  getCustomerTransmittals,

  getCustomerTransmittalById,
};