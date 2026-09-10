const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middleware/authMiddleware");
const {
  getTemplate,
  uploadTemplate,
} = require("../controllers/projectCoverPageTemplateController");

const router = express.Router();

const upload = multer({
  dest: "uploads/cover-page-templates/",
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  },
});

router.get(
  "/:projectId",
  authMiddleware,
  getTemplate
);

router.post(
  "/:projectId",
  authMiddleware,
  upload.single("template"),
  uploadTemplate
);

module.exports = router;
