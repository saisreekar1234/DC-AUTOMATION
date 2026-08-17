const express = require("express");

const {
  verifyTransmittalItem,
  verifyTransmittal,
} = require(
  "../controllers/revisionVerificationController"
);

const router = express.Router();


// ======================================================
// VERIFY ENTIRE TRANSMITTAL
// ======================================================

router.post(
  "/transmittal/:transmittalId",
  verifyTransmittal
);


// ======================================================
// VERIFY ONE ITEM
// ======================================================

router.post(
  "/item/:itemId",
  verifyTransmittalItem
);


module.exports = router;