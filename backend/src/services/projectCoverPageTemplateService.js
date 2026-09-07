const fs = require("fs/promises");
const path = require("path");
const pool = require("../config/database");

const TEMPLATE_ROOT = path.resolve(
  __dirname,
  "../../templates/cover-pages"
);

function safeProjectCode(value) {
  return String(value || "project")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_");
}

async function getProject(projectId) {
  const result = await pool.query(
    `SELECT id, project_code, project_name
     FROM projects
     WHERE id = $1
     LIMIT 1`,
    [projectId]
  );

  return result.rows[0] || null;
}

async function getTemplate(projectId) {
  const result = await pool.query(
    `SELECT
       id,
       project_id,
       template_name,
       template_file_path,
       template_version,
       is_active,
       created_at,
       updated_at
     FROM project_cover_page_templates
     WHERE project_id = $1
       AND is_active = TRUE
     ORDER BY id DESC
     LIMIT 1`,
    [projectId]
  );

  return result.rows[0] || null;
}

async function saveTemplate(projectId, file) {
  const project = await getProject(projectId);

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  const projectFolder = path.join(
    TEMPLATE_ROOT,
    safeProjectCode(project.project_code)
  );

  await fs.mkdir(projectFolder, { recursive: true });

  const templatePath = path.join(projectFolder, "cover-page.pdf");

  // Replace the physical file only after the upload has been validated.
  await fs.copyFile(file.path, templatePath);

  const existing = await getTemplate(projectId);
  const nextVersion = existing
    ? String(Number(existing.template_version || 0) + 1)
    : "1";

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE project_cover_page_templates
       SET is_active = FALSE,
           updated_at = CURRENT_TIMESTAMP
       WHERE project_id = $1
         AND is_active = TRUE`,
      [projectId]
    );

    const result = await client.query(
      `INSERT INTO project_cover_page_templates (
         project_id,
         template_name,
         template_file_path,
         template_version,
         is_active
       )
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING
         id,
         project_id,
         template_name,
         template_file_path,
         template_version,
         is_active,
         created_at,
         updated_at`,
      [
        projectId,
        file.originalname || "cover-page.pdf",
        templatePath,
        nextVersion,
      ]
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Rollback error:", rollbackError);
    }
    throw error;
  } finally {
    client.release();
    try {
      await fs.unlink(file.path);
    } catch (cleanupError) {
      console.warn("Temporary template cleanup failed:", cleanupError.message);
    }
  }
}

module.exports = {
  getTemplate,
  saveTemplate,
};
