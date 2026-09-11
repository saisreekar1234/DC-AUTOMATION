const documentImportService = require("../services/documentImportService");
const projectMemberService = require("../services/projectMemberService");

function isAdmin(req) {
  return String(req.user?.role || "").toLowerCase() === "admin";
}

async function ensureProjectAccess(req, res, projectId) {
  if (isAdmin(req)) return true;

  const access = await projectMemberService.hasProjectAccess(
    projectId,
    req.user.user_id
  );

  if (!access) {
    res.status(403).json({
      message: "You do not have access to this project",
    });
    return false;
  }

  return true;
}

async function importDocumentsFromExcel(req, res) {
  try {
    const projectId = Number(req.body.project_id);

    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({
        message: "A valid project_id is required.",
      });
    }

    if (!(await ensureProjectAccess(req, res, projectId))) {
      return;
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Please upload an Excel MDR file.",
      });
    }

    const result = await documentImportService.importExcel(
      req.file.buffer,
      projectId,
      req.user.user_id
    );

    return res.status(201).json({
      message: "Document register imported successfully.",
      ...result,
    });
  } catch (error) {
    console.error("DOCUMENT EXCEL IMPORT ERROR:", error);

    return res.status(error.statusCode || 500).json({
      message:
        error.message ||
        "Failed to import document register.",
    });
  }
}

module.exports = {
  importDocumentsFromExcel,
};
