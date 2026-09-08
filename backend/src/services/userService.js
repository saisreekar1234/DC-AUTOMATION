const bcrypt = require("bcrypt");

const pool =
  require("../config/database");


// ======================================================
// GET ALL USERS
// ======================================================

async function getUsers() {

  const result =
    await pool.query(
      `
        SELECT
          id,
          name,
          email,
          role,
          is_active,
          created_at,
          updated_at
        FROM users
        ORDER BY
          created_at DESC
      `
    );

  return result.rows;

}


// ======================================================
// GET USER BY ID
// ======================================================

async function getUserById(
  userId
) {

  const result =
    await pool.query(
      `
        SELECT
          id,
          name,
          email,
          role,
          is_active,
          created_at,
          updated_at
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId]
    );

  return result.rows[0];

}


// ======================================================
// CREATE USER
// ======================================================

async function createUser(
  user
) {

  const {
    name,
    email,
    password,
    role = "document_controller",
  } = user;


  // ----------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------

  if (!name) {

    throw new Error(
      "Name is required"
    );

  }


  if (!email) {

    throw new Error(
      "Email is required"
    );

  }


  if (!password) {

    throw new Error(
      "Password is required"
    );

  }


  if (password.length < 8) {

    throw new Error(
      "Password must contain at least 8 characters"
    );

  }


  // ----------------------------------------------------
  // ALLOWED ROLES
  // ----------------------------------------------------

  const allowedRoles = [
    "admin",
    "document_controller",
    "checker",
    "approver",
  ];


  if (
    !allowedRoles.includes(
      role
    )
  ) {

    throw new Error(
      "Invalid user role"
    );

  }


  // ----------------------------------------------------
  // CHECK EMAIL
  // ----------------------------------------------------

  const existingUser =
    await pool.query(
      `
        SELECT
          id
        FROM users
        WHERE LOWER(email) =
              LOWER($1)
        LIMIT 1
      `,
      [email]
    );


  if (
    existingUser.rows.length > 0
  ) {

    throw new Error(
      "A user with this email already exists"
    );

  }


  // ----------------------------------------------------
  // HASH PASSWORD
  // ----------------------------------------------------

  const passwordHash =
    await bcrypt.hash(
      password,
      12
    );


  // ----------------------------------------------------
  // INSERT USER
  // ----------------------------------------------------

  const result =
    await pool.query(
      `
        INSERT INTO users
        (
          name,
          email,
          password_hash,
          role,
          is_active
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          TRUE
        )
        RETURNING
          id,
          name,
          email,
          role,
          is_active,
          created_at,
          updated_at
      `,
      [
        name,
        email,
        passwordHash,
        role,
      ]
    );


  return result.rows[0];

}


// ======================================================
// UPDATE USER
// ======================================================

async function updateUser(
  userId,
  user
) {

  const {
    name,
    email,
    role,
    is_active,
  } = user;


  // ----------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------

  const allowedRoles = [
    "admin",
    "document_controller",
    "checker",
    "approver",
  ];


  if (
    role !== undefined &&
    !allowedRoles.includes(
      role
    )
  ) {

    throw new Error(
      "Invalid user role"
    );

  }


  // ----------------------------------------------------
  // BUILD UPDATE
  // ----------------------------------------------------

  const result =
    await pool.query(
      `
        UPDATE users
        SET
          name =
            COALESCE($1, name),

          email =
            COALESCE($2, email),

          role =
            COALESCE($3, role),

          is_active =
            COALESCE($4, is_active),

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id = $5

        RETURNING
          id,
          name,
          email,
          role,
          is_active,
          created_at,
          updated_at
      `,
      [
        name ?? null,
        email ?? null,
        role ?? null,
        is_active ?? null,
        userId,
      ]
    );


  if (
    result.rows.length === 0
  ) {

    throw new Error(
      "User not found"
    );

  }


  return result.rows[0];

}


// ======================================================
// RESET USER PASSWORD
// ======================================================

async function resetUserPassword(
  userId,
  password
) {

  if (!password) {

    throw new Error(
      "Password is required"
    );

  }


  if (password.length < 8) {

    throw new Error(
      "Password must contain at least 8 characters"
    );

  }


  const passwordHash =
    await bcrypt.hash(
      password,
      12
    );


  const result =
    await pool.query(
      `
        UPDATE users

        SET
          password_hash =
            $1,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id = $2

        RETURNING
          id,
          name,
          email,
          role,
          is_active
      `,
      [
        passwordHash,
        userId,
      ]
    );


  if (
    result.rows.length === 0
  ) {

    throw new Error(
      "User not found"
    );

  }


  return result.rows[0];

}


// ======================================================
// CURRENT USER PROFILE
// ======================================================

async function updateOwnProfile(userId, user) {
  const name = String(user?.name || "").trim();
  const email = String(user?.email || "").trim();

  if (!name) throw new Error("Name is required");
  if (!email) throw new Error("Email is required");

  const existing = await pool.query(
    `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1`,
    [email, userId],
  );
  if (existing.rows.length) throw new Error("A user with this email already exists");

  const result = await pool.query(
    `UPDATE users SET name = $1, email = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3
     RETURNING id, name, email, role, is_active, created_at, updated_at`,
    [name, email, userId],
  );
  if (!result.rows.length) throw new Error("User not found");
  return result.rows[0];
}

async function changeOwnPassword(userId, currentPassword, newPassword) {
  if (!currentPassword) throw new Error("Current password is required");
  if (!newPassword || newPassword.length < 8) throw new Error("New password must contain at least 8 characters");

  const result = await pool.query(`SELECT password_hash FROM users WHERE id = $1 LIMIT 1`, [userId]);
  if (!result.rows.length) throw new Error("User not found");

  const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!valid) throw new Error("Current password is incorrect");

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await pool.query(
    `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [passwordHash, userId],
  );

  return true;
}

async function deactivateUser(userId, requestingUserId) {
  if (Number(userId) === Number(requestingUserId)) {
    throw new Error("You cannot disable your own administrator account");
  }

  const result = await pool.query(
    `UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1
     RETURNING id, name, email, role, is_active, created_at, updated_at`,
    [userId],
  );
  if (!result.rows.length) throw new Error("User not found");
  return result.rows[0];
}


// ======================================================
// EXPORT
// ======================================================

module.exports = {

  getUsers,

  getUserById,

  createUser,

  updateUser,

  resetUserPassword,
  updateOwnProfile,
  changeOwnPassword,
  deactivateUser,

};