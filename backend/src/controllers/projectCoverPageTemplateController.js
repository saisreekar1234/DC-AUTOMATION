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

async function uploadTemplate(req, res) {
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
  uploadTemplate,
};
