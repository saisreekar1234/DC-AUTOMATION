const projectService = require("../services/projectService");
const projectMemberService = require("../services/projectMemberService");

async function createProject(req, res) {
  try {
    const project = await projectService.createProject(req.body);

    res.status(201).json(project);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to create project",
    });
  }
}

async function getProjects(req, res) {
  try {
    // Admins can see every project. Other users can see only projects assigned to them.
    const projects =
      String(req.user?.role || "").toLowerCase() === "admin"
        ? await projectService.getProjects()
        : await projectMemberService.getProjectsForUser(req.user.user_id);

    res.json(projects);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch projects",
    });
  }
}

async function getProjectById(req, res) {
  try {
    const project = await projectService.getProjectById(req.params.id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isAdmin = String(req.user?.role || "").toLowerCase() === "admin";

    if (!isAdmin) {
      const access = await projectMemberService.hasProjectAccess(
        project.id,
        req.user.user_id
      );

      if (!access) {
        return res.status(403).json({
          message: "You do not have access to this project",
        });
      }
    }

    res.json(project);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch project",
    });
  }
}

module.exports = {
  createProject,
  getProjects,
  getProjectById,
};