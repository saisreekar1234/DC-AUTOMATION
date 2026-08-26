const pool = require("../config/database");


// ======================================================
// GET PROJECT MEMBERS
// ======================================================

async function getProjectMembers(projectId) {

  const result = await pool.query(
    `
      SELECT
        pm.id,
        pm.project_id,
        pm.user_id,
        pm.permission_level,
        pm.assigned_at,

        u.name,
        u.email,
        u.role,
        u.is_active

      FROM project_members pm

      INNER JOIN users u
        ON u.id = pm.user_id

      WHERE pm.project_id = $1

      ORDER BY
        pm.assigned_at ASC
    `,
    [projectId]
  );

  return result.rows;
}


// ======================================================
// ASSIGN USER TO PROJECT
// ======================================================

async function assignUserToProject(
  projectId,
  userId,
  permissionLevel = "member"
) {

  // ----------------------------------------------------
  // CHECK PROJECT
  // ----------------------------------------------------

  const projectResult = await pool.query(
    `
      SELECT
        id,
        project_code,
        project_name,
        is_active
      FROM projects
      WHERE id = $1
      LIMIT 1
    `,
    [projectId]
  );


  if (projectResult.rows.length === 0) {

    throw new Error(
      "Project not found"
    );

  }


  if (!projectResult.rows[0].is_active) {

    throw new Error(
      "Cannot assign users to an inactive project"
    );

  }


  // ----------------------------------------------------
  // CHECK USER
  // ----------------------------------------------------

  const userResult = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        role,
        is_active
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId]
  );


  if (userResult.rows.length === 0) {

    throw new Error(
      "User not found"
    );

  }


  if (!userResult.rows[0].is_active) {

    throw new Error(
      "Cannot assign an inactive user"
    );

  }


  // ----------------------------------------------------
  // VALIDATE PERMISSION
  // ----------------------------------------------------

  const allowedPermissions = [
    "member",
    "manager",
    "viewer",
  ];


  if (
    !allowedPermissions.includes(
      permissionLevel
    )
  ) {

    throw new Error(
      "Invalid permission level"
    );

  }


  // ----------------------------------------------------
  // CHECK EXISTING ASSIGNMENT
  // ----------------------------------------------------

  const existingResult = await pool.query(
    `
      SELECT
        id
      FROM project_members

      WHERE project_id = $1
        AND user_id = $2

      LIMIT 1
    `,
    [
      projectId,
      userId,
    ]
  );


  if (existingResult.rows.length > 0) {

    throw new Error(
      "User is already assigned to this project"
    );

  }


  // ----------------------------------------------------
  // CREATE ASSIGNMENT
  // ----------------------------------------------------

  const result = await pool.query(
    `
      INSERT INTO project_members
      (
        project_id,
        user_id,
        permission_level
      )

      VALUES
      (
        $1,
        $2,
        $3
      )

      RETURNING
        id,
        project_id,
        user_id,
        permission_level,
        assigned_at
    `,
    [
      projectId,
      userId,
      permissionLevel,
    ]
  );


  // ----------------------------------------------------
  // RETURN ASSIGNMENT WITH USER DETAILS
  // ----------------------------------------------------

  const assignmentResult = await pool.query(
    `
      SELECT
        pm.id,
        pm.project_id,
        pm.user_id,
        pm.permission_level,
        pm.assigned_at,

        u.name,
        u.email,
        u.role,
        u.is_active

      FROM project_members pm

      INNER JOIN users u
        ON u.id = pm.user_id

      WHERE pm.id = $1
    `,
    [result.rows[0].id]
  );


  return assignmentResult.rows[0];
}


// ======================================================
// UPDATE PROJECT MEMBER PERMISSION
// ======================================================

async function updateProjectMember(
  projectId,
  userId,
  permissionLevel
) {

  const allowedPermissions = [
    "member",
    "manager",
    "viewer",
  ];


  if (
    !allowedPermissions.includes(
      permissionLevel
    )
  ) {

    throw new Error(
      "Invalid permission level"
    );

  }


  const result = await pool.query(
    `
      UPDATE project_members

      SET
        permission_level = $1

      WHERE project_id = $2
        AND user_id = $3

      RETURNING
        id,
        project_id,
        user_id,
        permission_level,
        assigned_at
    `,
    [
      permissionLevel,
      projectId,
      userId,
    ]
  );


  if (result.rows.length === 0) {

    throw new Error(
      "Project member assignment not found"
    );

  }


  return result.rows[0];
}


// ======================================================
// REMOVE USER FROM PROJECT
// ======================================================

async function removeUserFromProject(
  projectId,
  userId
) {

  const result = await pool.query(
    `
      DELETE FROM project_members

      WHERE project_id = $1
        AND user_id = $2

      RETURNING
        id,
        project_id,
        user_id,
        permission_level,
        assigned_at
    `,
    [
      projectId,
      userId,
    ]
  );


  if (result.rows.length === 0) {

    throw new Error(
      "Project member assignment not found"
    );

  }


  return result.rows[0];
}


// ======================================================
// CHECK USER PROJECT ACCESS
// ======================================================

async function hasProjectAccess(
  projectId,
  userId
) {

  const result = await pool.query(
    `
      SELECT
        pm.id,
        pm.project_id,
        pm.user_id,
        pm.permission_level

      FROM project_members pm

      WHERE pm.project_id = $1
        AND pm.user_id = $2

      LIMIT 1
    `,
    [
      projectId,
      userId,
    ]
  );


  return result.rows[0] || null;
}


// ======================================================
// GET PROJECTS ASSIGNED TO USER
// ======================================================

async function getProjectsForUser(
  userId
) {

  const result = await pool.query(
    `
      SELECT
        p.*,

        pm.permission_level,
        pm.assigned_at

      FROM project_members pm

      INNER JOIN projects p
        ON p.id = pm.project_id

      WHERE pm.user_id = $1
        AND p.is_active = TRUE

      ORDER BY
        p.created_at DESC
    `,
    [userId]
  );


  return result.rows;
};


// ======================================================
// EXPORT
// ======================================================

module.exports = {

  getProjectMembers,

  assignUserToProject,

  updateProjectMember,

  removeUserFromProject,

  hasProjectAccess,

  getProjectsForUser,

};