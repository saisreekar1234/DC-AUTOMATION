const express = require("express");

const authMiddleware =
  require("../middleware/authMiddleware");

const {
  processCustomerResponse,
  processCustomerTransmittal,
  getCustomerResponsesByTransmittal,
  getCustomerResponseById,
  mapCustomerResponseToDocument,
} = require("../controllers/customerResponseController");


const router =
  express.Router();


// ======================================================
// GET CUSTOMER RESPONSES FOR TRANSMITTAL
// ======================================================

router.get(
  "/transmittal/:transmittalId",
  authMiddleware,
  getCustomerResponsesByTransmittal
);


// ======================================================
// GET ONE CUSTOMER RESPONSE
// ======================================================

router.get(
  "/item/:itemId",
  authMiddleware,
  getCustomerResponseById
);


// ======================================================
// PROCESS ENTIRE TRANSMITTAL
// ======================================================

router.post(
  "/transmittal/:transmittalId",
  authMiddleware,
  processCustomerTransmittal
);


// ======================================================
// PROCESS ONE CUSTOMER RESPONSE
// ======================================================

router.post(
  "/item/:itemId",
  authMiddleware,
  processCustomerResponse
);


// ======================================================
// MAP CUSTOMER RESPONSE TO INTERNAL DOCUMENT
// ======================================================

router.post(
  "/item/:itemId/map-document",
  authMiddleware,
  mapCustomerResponseToDocument
);


module.exports = router;
