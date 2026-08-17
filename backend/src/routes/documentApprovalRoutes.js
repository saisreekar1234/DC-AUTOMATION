const express = require("express");

const {
  getRevisionApprovalStatus,
  promoteRevision,
} = require("../controllers/documentApprovalController");

const router = express.Router();


// ======================================================
// CHECK REVISION APPROVAL STATUS
// ======================================================

router.get(
  "/revisions/:revisionId/status",
  getRevisionApprovalStatus
);


// ======================================================
// PROMOTE REVIEW REVISION
// ======================================================

router.post(
  "/revisions/:revisionId/promote",
  promoteRevision
);


module.exports = router;