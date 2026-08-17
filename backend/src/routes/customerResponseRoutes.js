const express = require("express");

const {

  processCustomerResponse,

  processCustomerTransmittal,

  getCustomerResponsesByTransmittal,

  getCustomerResponseById,

} = require(
  "../controllers/customerResponseController"
);

const router =
  express.Router();


// ======================================================
// 1. GET CUSTOMER RESPONSES FOR ENTIRE TRANSMITTAL
// ======================================================

router.get(
  "/transmittal/:transmittalId",
  getCustomerResponsesByTransmittal
);


// ======================================================
// 2. GET ONE CUSTOMER RESPONSE
// ======================================================

router.get(
  "/item/:itemId",
  getCustomerResponseById
);


// ======================================================
// 3. PROCESS ENTIRE TRANSMITTAL
// ======================================================

router.post(
  "/transmittal/:transmittalId",
  processCustomerTransmittal
);


// ======================================================
// 4. PROCESS ONE RESPONSE
// ======================================================

router.post(
  "/item/:itemId",
  processCustomerResponse
);


// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;