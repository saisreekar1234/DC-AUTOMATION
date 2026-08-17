const projectService = require("../services/projectService");

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
    const projects = await projectService.getProjects();

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