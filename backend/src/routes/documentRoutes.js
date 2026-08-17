const express = require("express");

const {
  createDocument,
  getDocuments,
  getDocumentById,
  getCurrentRevision,
} = require("../controllers/documentController");

const router = express.Router();


// ======================================================
// CREATE DOCUMENT
// ======================================================

router.post(
  "/",
  createDocument
);


// ======================================================
// GET ALL DOCUMENTS
// ======================================================

router.get(
  "/",
  getDocuments
);


// ======================================================
// GET CURRENT REVISION
// IMPORTANT:
// This must come BEFORE /:id
// ======================================================

router.get(
  "/:id/current-revision",
  getCurrentRevision
);


// ======================================================
// GET DOCUMENT BY ID
// ======================================================

router.get(
  "/:id",
  getDocumentById
);


// ======================================================
// EXPORT
// ======================================================

module.exports = router;