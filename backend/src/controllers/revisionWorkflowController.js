const revisionWorkflowService =
  require("../services/revisionWorkflowService");


// ======================================================
// CREATE REVIEW REVISION
// ======================================================

async function createReviewRevision(
  req,
  res
) {

  try {

    const result =
      await revisionWorkflowService.createReviewRevision(
        req.params.itemId
      );

    res.status(201).json(result);

  } catch (error) {

    console.error(error);

    res.status(400).json({
      message:
        error.message ||
        "Failed to create review revision",
    });
  }
}


module.exports = {
  createReviewRevision,
};