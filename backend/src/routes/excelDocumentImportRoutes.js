const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middleware/authMiddleware");
const { importExcelDocumentRegister } = require("../controllers/excelDocumentImportController");

const router = express.Router();
const upload = multer({
  dest: "uploads/document-register-imports/",
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/vnd.ms-excel.sheet.macroEnabled.12",
    ];
    if (!allowed.includes(file.mimetype) && !/\.(xlsx|xlsm|xls)$/i.test(file.originalname)) {
      return cb(new Error("Only Excel workbooks (.xlsx, .xlsm, .xls) are allowed"));
    }
    cb(null, true);
  },
});

router.post("/:projectId", authMiddleware, upload.single("workbook"), importExcelDocumentRegister);

module.exports = router;
