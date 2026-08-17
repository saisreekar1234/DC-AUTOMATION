const express = require("express");

const {
  createReviewRevision,
} = require(
  "../controllers/revisionWorkflowController"
);

const router = express.Router();


// ======================================================
// CREATE NEXT REVIEW REVISION
// ======================================================

router.post(
  "/transmittal-item/:itemId/create-review",
  createReviewRevision
);


module.exports = router;