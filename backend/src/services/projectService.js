const pool = require("../config/database");

async function createProject(project) {
  const { project_code, project_name, client_name, description } = project;

  const result = await pool.query(
    `INSERT INTO projects
      (project_code, project_name, client_name, description)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [project_code, project_name, client_name, description]
  );

  return result.rows[0];
}

async function getProjects() {
  const result = await pool.query(
    `SELECT * FROM projects
     ORDER BY created_at DESC`
  );

  return result.rows;
}

async function getProjectById(id) {
  const result = await pool.query(
    `SELECT * FROM projects
     WHERE id = $1`,
    [id]
  );

  return result.rows[0];
}

module.exports = {
  createProject,
  getProjects,
  getProjectById,
};