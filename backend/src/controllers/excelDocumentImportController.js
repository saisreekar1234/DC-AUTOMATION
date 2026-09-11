const excelDocumentImportService = require("../services/excelDocumentImportService");
const projectMemberService = require("../services/projectMemberService");

function isAdmin(req) {
  return String(req.user?.role || "").toLowerCase() === "admin";
}

async function importExcelDocumentRegister(req, res) {
  try {
    const projectId = Number(req.params.projectId);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({ message: "A valid project id is required" });
    }
    if (!isAdmin(req)) {
      return res.status(403).json({ message: "Only administrators can import the master Excel register" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Please upload the Excel workbook" });
    }

    const summary = await excelDocumentImportService.importWorkbook(
      projectId,
      req.file.path,
      req.file.originalname,
      req.user.user_id
    );

    return res.status(201).json({
      message: "Document register imported successfully",
      summary,
    });
  } catch (error) {
    console.error("EXCEL DOCUMENT REGISTER IMPORT ERROR:", error);
    return res.status(500).json({ message: error.message || "Failed to import Excel document register" });
  }
}

module.exports = { importExcelDocumentRegister };
