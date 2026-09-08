const projectCoverPageConfigService = require("../services/projectCoverPageConfigService");
const projectMemberService = require("../services/projectMemberService");

function isAdmin(req) {
  return String(req.user?.role || "").toLowerCase() === "admin";
}

async function ensureProjectAccess(req, res, projectId) {
  if (isAdmin(req)) return true;
  const access = await projectMemberService.hasProjectAccess(projectId, req.user.user_id);
  if (!access) {
    res.status(403).json({ message: "You do not have access to this project" });
    return false;
  }
  return true;
}

async function getConfig(req, res) {
  try {
    if (!(await ensureProjectAccess(req, res, req.params.projectId))) return;
    const config = await projectCoverPageConfigService.getActiveConfig(req.params.projectId);
    if (!config) return res.status(404).json({ message: "No cover-page template configured for this project" });
    res.json(config);
  } catch (error) {
    console.error("GET COVER PAGE CONFIG ERROR:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Unable to load cover-page configuration" });
  }
}

async function updateConfig(req, res) {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Only administrators can configure cover-page fields" });
    const config = await projectCoverPageConfigService.saveConfig(req.params.projectId, req.body || {}, req.user.user_id);
    res.json(config);
  } catch (error) {
    console.error("UPDATE COVER PAGE CONFIG ERROR:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Unable to save cover-page configuration" });
  }
}

module.exports = { getConfig, updateConfig };
