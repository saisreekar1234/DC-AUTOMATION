const express = require("express");
const multer = require("multer");

const {
  uploadTransmittal,
  analyseTransmittal,
  getCustomerTransmittals,
  getCustomerTransmittalById,
} = require(
  "../controllers/customerTransmittalController"
);

const router = express.Router();


// ======================================================
// MULTER CONFIGURATION
// ======================================================

const upload = multer({

  dest:
    "uploads/customer-transmittals/",

  limits: {
    fileSize:
      20 * 1024 * 1024,
  },

  fileFilter: (
    req,
    file,
    cb
  ) => {

    if (
      file.mimetype !==
      "application/pdf"
    ) {

      return cb(
        new Error(
          "Only PDF files are allowed"
        )
      );
    }

    cb(null, true);
  },
});


// ======================================================
// 1. GET ALL CUSTOMER TRANSMITTALS
// ======================================================

router.get(
  "/",
  getCustomerTransmittals
);


// ======================================================
// 2. GET ONE CUSTOMER TRANSMITTAL
// ======================================================

router.get(
  "/:id",
  getCustomerTransmittalById
);


// ======================================================
// 3. UPLOAD CUSTOMER TRANSMITTAL
// ======================================================

router.post(
  "/upload",
  upload.single("transmittal"),
  uploadTransmittal
);


// ======================================================
// 4. ANALYSE CUSTOMER TRANSMITTAL
// ======================================================

router.get(
  "/:id/analyse",
  analyseTransmittal
);


// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;