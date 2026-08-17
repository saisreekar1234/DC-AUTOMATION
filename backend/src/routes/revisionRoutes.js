const express = require("express");

const {
  getRevisions,
  createRevision,
  createNextRevision,
} = require("../controllers/revisionController");

const router = express.Router();

router.get("/:documentId", getRevisions);

router.post("/:documentId", createRevision);

router.post("/:documentId/next", createNextRevision);

module.exports = router;