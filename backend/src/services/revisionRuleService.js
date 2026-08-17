const pool = require("../config/database");

async function createRule(projectId, ruleData) {
  const {
    rule_name,
    review_revision_start,
    review_revision_pattern,
    approved_revision_start,
    approved_revision_pattern,
    issue_purposes,
  } = ruleData;

  const result = await pool.query(
    `INSERT INTO project_revision_rules (
      project_id,
      rule_name,
      review_revision_start,
      review_revision_pattern,
      approved_revision_start,
      approved_revision_pattern,
      issue_purposes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      projectId,
      rule_name,
      review_revision_start || null,
      review_revision_pattern || null,
      approved_revision_start || null,
      approved_revision_pattern || null,
      JSON.stringify(issue_purposes || []),
    ]
  );

  return result.rows[0];
}

async function getRules(projectId) {
  const result = await pool.query(
    `SELECT *
     FROM project_revision_rules
     WHERE project_id = $1
     ORDER BY id ASC`,
    [projectId]
  );

  return result.rows;
}

module.exports = {
  createRule,
  getRules,
};