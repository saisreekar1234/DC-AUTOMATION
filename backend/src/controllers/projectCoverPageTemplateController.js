const fs = require("fs");
const path = require("path");

const projectCoverPageTemplateService = require(
  "../services/projectCoverPageTemplateService"
);
const projectMemberService = require(
  "../services/projectMemberService"
);

function isAdmin(req) {
  return String(req.user?.role || "").toLowerCase() === "admin";
}

async function ensureProjectAccess(req, res, projectId) {
  if (isAdmin(req)) {
    return true;
  }

  const hasAccess = await projectMemberService.hasProjectAccess(
    projectId,
    req.user.user_id
  );

  if (!hasAccess) {
    res.status(403).json({
      message: "You do not have access to this project",
    });
    return false;
  }

  return true;
}

async function getTemplate(req, res) {
  try {
    const projectId = Number(req.params.projectId);

    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({
        message: "A valid project id is required",
      });
    }

    if (!(await ensureProjectAccess(req, res, projectId))) {
      return;
    }

    const template = await projectCoverPageTemplateService.getTemplate(
      projectId
    );

    if (!template) {
      return res.status(404).json({
        message: "No cover page template configured for this project",
      });
    }

    return res.json({ template });
  } catch (error) {
    console.error("GET COVER PAGE TEMPLATE ERROR:", error);
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to fetch cover-page template",
    });
  }
}

async function getTemplateFile(req, res) {
  try {
    const projectId = Number(req.params.projectId);

    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({
        message: "A valid project id is required",
      });
    }

    if (!(await ensureProjectAccess(req, res, projectId))) {
      return;
    }

    const template = await projectCoverPageTemplateService.getTemplate(
      projectId
    );

    if (!template) {
      return res.status(404).json({
        message: "No cover page template configured for this project",
      });
    }

    const templateRoot = path.resolve(
      process.env.COVER_PAGE_TEMPLATE_ROOT ||
        path.join(__dirname, "../../templates/cover-pages")
    );

    const filePath = path.resolve(template.template_file_path);
    const relativePath = path.relative(templateRoot, filePath);

    // Prevent a database/path mistake from becoming arbitrary file access.
    if (
      relativePath.startsWith("..") ||
      path.isAbsolute(relativePath)
    ) {
      return res.status(500).json({
        message: "Invalid cover-page template path",
      });
    }

    if (!filePath.toLowerCase().endsWith(".pdf")) {
      return res.status(400).json({
        message: "Configured cover-page template is not a PDF",
      });
    }

    await fs.promises.access(filePath, fs.constants.R_OK);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "private, no-store");

    const stream = fs.createReadStream(filePath);

    stream.on("error", (error) => {
      console.error("COVER PAGE TEMPLATE STREAM ERROR:", error);

      if (!res.headersSent) {
        res.status(500).json({
          message: "Failed to read cover-page template",
        });
      } else {
        res.destroy(error);
      }
    });

    stream.pipe(res);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EACCES") {
      return res.status(404).json({
        message: "Cover-page template file could not be found",
      });
    }

    console.error("GET COVER PAGE TEMPLATE FILE ERROR:", error);

    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to load cover-page template",
    });
  }
}

async function uploadTemplate(req, res) {
  try {
    const projectId = Number(req.params.projectId);

    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({
        message: "A valid project id is required",
      });
    }

    if (!isAdmin(req)) {
      return res.status(403).json({
        message:
          "Only administrators can upload or replace project cover-page templates",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Please upload a PDF cover-page template",
      });
    }

    const template = await projectCoverPageTemplateService.saveTemplate(
      projectId,
      req.file
    );

    return res.status(201).json({
      message: "Cover-page template uploaded successfully",
      template,
    });
  } catch (error) {
    console.error("UPLOAD COVER PAGE TEMPLATE ERROR:", error);
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to upload cover-page template",
    });
  }
}

module.exports = {
  getTemplate,
  getTemplateFile,
  uploadTemplate,
};
