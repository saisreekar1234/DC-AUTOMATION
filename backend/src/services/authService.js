const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const pool = require("../config/database");


// ======================================================
// LOGIN USER
// ======================================================

async function loginUser(email, password) {

  // ----------------------------------------------------
  // 1. FIND USER
  // ----------------------------------------------------

  const result = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        password_hash,
        role,
        is_active,
        created_at
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    [email]
  );


  // ----------------------------------------------------
  // 2. USER NOT FOUND
  // ----------------------------------------------------

  if (result.rows.length === 0) {

    throw new Error(
      "Invalid email or password"
    );

  }


  const user =
    result.rows[0];


  // ----------------------------------------------------
  // 3. CHECK USER ACTIVE
  // ----------------------------------------------------

  if (!user.is_active) {

    throw new Error(
      "Your account is inactive. Please contact an administrator."
    );

  }


  // ----------------------------------------------------
  // 4. CHECK PASSWORD
  // ----------------------------------------------------

  const passwordMatches =
    await bcrypt.compare(
      password,
      user.password_hash
    );


  if (!passwordMatches) {

    throw new Error(
      "Invalid email or password"
    );

  }


  // ----------------------------------------------------
  // 5. CHECK JWT SECRET
  // ----------------------------------------------------

  if (!process.env.JWT_SECRET) {

    throw new Error(
      "JWT_SECRET is not configured"
    );

  }


  // ----------------------------------------------------
  // 6. CREATE JWT TOKEN
  // ----------------------------------------------------

  const token =
    jwt.sign(
      {
        user_id: user.id,
        role: user.role,
      },

      process.env.JWT_SECRET,

      {
        expiresIn:
          process.env.JWT_EXPIRES_IN ||
          "8h",
      }
    );


  // ----------------------------------------------------
  // 7. REMOVE PASSWORD HASH
  // ----------------------------------------------------

  delete user.password_hash;


  // ----------------------------------------------------
  // 8. RETURN LOGIN RESULT
  // ----------------------------------------------------

  return {

    token,

    user,

  };

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
// EXPORT
// ======================================================

module.exports = {

  loginUser,

  getUserById,

};