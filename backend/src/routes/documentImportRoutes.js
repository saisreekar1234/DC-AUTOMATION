const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middleware/authMiddleware");
const {
  importDocumentsFromExcel,
} = require("../controllers/documentImportController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!/\.(xlsx|xls|xlsm)$/i.test(file.originalname)) {
      return cb(
        new Error(
          "Only Excel files (.xlsx, .xls, .xlsm) are allowed."
        )
      );
    }

    cb(null, true);
  },
});

router.post(
  "/import-excel",
  authMiddleware,
  upload.single("file"),
  importDocumentsFromExcel
);

module.exports = router;
