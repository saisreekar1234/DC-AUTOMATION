const documentService = require("../services/documentService");


// ======================================================
// 1. CREATE DOCUMENT
// ======================================================

async function createDocument(req, res) {
  try {

    const document =
      await documentService.createDocument(req.body);

    res.status(201).json(document);

  } catch (error) {

    console.error(error);

    // PostgreSQL duplicate key
    if (error.code === "23505") {
      return res.status(409).json({
        message:
          "Document number already exists for this project",
      });
    }

    res.status(500).json({
      message: "Failed to create document",
    });
  }
}


// ======================================================
// 2. GET DOCUMENTS
// ======================================================

async function getDocuments(req, res) {
  try {

    const projectId =
      req.query.project_id;

    if (!projectId) {
      return res.status(400).json({
        message: "project_id is required",
      });
    }

    const documents =
      await documentService.getDocuments(
        projectId
      );

    res.json(documents);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to fetch documents",
    });
  }
}


// ======================================================
// 3. GET DOCUMENT BY ID
// ======================================================

async function getDocumentById(req, res) {
  try {

    const document =
      await documentService.getDocumentById(
        req.params.id
      );

    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    res.json(document);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to fetch document",
    });
  }
}

async function getCurrentRevision(req, res) {

  try {

    const revision =
      await documentService.getCurrentRevision(
        req.params.id
      );

    if (!revision) {

      return res.status(404).json({
        message: "Document not found",
      });
    }

    res.json(revision);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        "Failed to fetch current revision",
    });
  }
}

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  createDocument,
  getDocuments,
  getDocumentById,
  getCurrentRevision,
};