const documentService = require("../services/documentService");
const projectMemberService = require("../services/projectMemberService");


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
    const projectId = req.query.project_id;
    const isAdmin =
      String(req.user?.role || "").toLowerCase() === "admin";

    // Project Details: return only the selected project.
    if (projectId) {
      if (!isAdmin) {
        const access =
          await projectMemberService.hasProjectAccess(
            projectId,
            req.user.user_id
          );

        if (!access) {
          return res.status(403).json({
            message: "You do not have access to this project",
          });
        }
      }

      const documents =
        await documentService.getDocuments(projectId);

      return res.json(documents);
    }

    // Global Documents page: administrators see all documents;
    // normal users see only documents from their assigned projects.
    const documents = isAdmin
      ? await documentService.getDocuments()
      : await documentService.getDocumentsForUser(req.user.user_id);

    return res.json(documents);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
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