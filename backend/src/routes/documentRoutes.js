const express = require("express");

const {
  createDocument,
  getDocuments,
  getDocumentById,
  getCurrentRevision,
} = require("../controllers/documentController");

const {
  generateCoverPage,
} = require("../controllers/coverPageController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// ======================================================
// CREATE DOCUMENT
// ======================================================

router.post(
  "/",
  authMiddleware,
  createDocument
);


// ======================================================
// GET DOCUMENTS
// ======================================================

router.get(
  "/",
  authMiddleware,
  getDocuments
);


// ======================================================
// GET CURRENT REVISION
// ======================================================

router.get(
  "/:id/current-revision",
  authMiddleware,
  getCurrentRevision
);


// ======================================================
// GENERATE COVER PAGE PDF
// IMPORTANT: THIS MUST COME BEFORE /:id
// ======================================================

router.get(
  "/:id/cover-page",
  authMiddleware,
  generateCoverPage
);


// ======================================================
// GET DOCUMENT BY ID
// IMPORTANT: KEEP THIS LAST
// ======================================================

router.get(
  "/:id",
  authMiddleware,
  getDocumentById
);


module.exports = router;