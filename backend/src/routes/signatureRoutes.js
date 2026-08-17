const express = require("express");
const multer = require("multer");
const path = require("path");

const {
  uploadSignature,
  getActiveSignature,
  getUserSignatures,

  createSignatureWorkflow,
  getSignatureWorkflow,
  signDocumentStep,
} = require("../controllers/signatureController");

const router = express.Router();


// ======================================================
// MULTER STORAGE
// ======================================================

const storage = multer.diskStorage({

  destination: function (req, file, cb) {

    cb(
      null,
      "uploads/signatures/"
    );
  },

  filename: function (req, file, cb) {

    const extension =
      path.extname(file.originalname)
        .toLowerCase();

    const fileName =
      `user-${req.params.userId}-${Date.now()}${extension}`;

    cb(null, fileName);
  },
});


// ======================================================
// FILE FILTER
// ======================================================

const upload = multer({

  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: function (
    req,
    file,
    cb
  ) {

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.mimetype
      )
    ) {

      return cb(
        new Error(
          "Only PNG, JPG, JPEG and WEBP signature images are allowed"
        )
      );
    }

    cb(null, true);
  },
});


// ======================================================
// USER SIGNATURE
// ======================================================

// Upload signature
router.post(
  "/users/:userId/signature",
  upload.single("signature"),
  uploadSignature
);


// Get active signature
router.get(
  "/users/:userId/signature",
  getActiveSignature
);


// Get signature history
router.get(
  "/users/:userId/signatures",
  getUserSignatures
);


// ======================================================
// DOCUMENT SIGNATURE WORKFLOW
// ======================================================

// Create workflow for a revision
//
// POST
// /api/signatures/documents/:documentId/revisions/:revisionId/workflow
//
router.post(
  "/documents/:documentId/revisions/:revisionId/workflow",
  createSignatureWorkflow
);


// Get workflow
//
// GET
// /api/signatures/documents/:documentId/revisions/:revisionId/workflow
//
router.get(
  "/documents/:documentId/revisions/:revisionId/workflow",
  getSignatureWorkflow
);


// Sign one signature step
//
// POST
// /api/signatures/document-signatures/:documentSignatureId/sign
//
router.post(
  "/document-signatures/:documentSignatureId/sign",
  signDocumentStep
);


module.exports = router;