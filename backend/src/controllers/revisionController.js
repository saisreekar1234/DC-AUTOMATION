const revisionService = require("../services/revisionService");


// ======================================================
// 1. GET ALL REVISIONS
// ======================================================

async function getRevisions(req, res) {
  try {
    const revisions = await revisionService.getRevisions(
      req.params.documentId
    );

    res.json(revisions);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch revisions",
    });
  }
}


// ======================================================
// 2. MANUALLY CREATE A REVISION
// ======================================================

async function createRevision(req, res) {
  try {
    const revision = await revisionService.createRevision(
      req.params.documentId,
      req.body
    );

    res.status(201).json(revision);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message || "Failed to create revision",
    });
  }
}


// ======================================================
// 3. AUTOMATICALLY CREATE NEXT REVISION
// ======================================================

async function createNextRevision(req, res) {
  try {
    const revision = await revisionService.createNextRevision(
      req.params.documentId,
      req.body
    );

    res.status(201).json(revision);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message:
        error.message ||
        "Failed to create next revision",
    });
  }
}


// ======================================================
// EXPORT
// ======================================================

module.exports = {
  getRevisions,
  createRevision,
  createNextRevision,
};