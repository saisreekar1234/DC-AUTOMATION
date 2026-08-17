const documentApprovalService =
  require("../services/documentApprovalService");


// ======================================================
// GET APPROVAL STATUS
// ======================================================

async function getRevisionApprovalStatus(
  req,
  res
) {

  try {

    const result =
      await documentApprovalService
        .getRevisionApprovalStatus(
          req.params.revisionId
        );

    res.json(result);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        error.message ||
        "Failed to get revision approval status",
    });
  }
}


// ======================================================
// PROMOTE REVISION
// ======================================================

async function promoteRevision(
  req,
  res
) {

  try {

    const result =
      await documentApprovalService
        .promoteRevision(
          req.params.revisionId
        );

    res.json(result);

  } catch (error) {

    console.error(error);

    res.status(400).json({
      message:
        error.message ||
        "Failed to promote revision",
    });
  }
}


module.exports = {
  getRevisionApprovalStatus,
  promoteRevision,
};