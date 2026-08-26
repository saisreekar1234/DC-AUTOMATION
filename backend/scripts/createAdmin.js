const dotenv = require("dotenv");

// ======================================================
// LOAD ENVIRONMENT VARIABLES
// IMPORTANT: Must come BEFORE database import
// ======================================================

dotenv.config();

const bcrypt = require("bcrypt");
const readline = require("readline");

const pool = require("../src/config/database");

// ======================================================
// READ INPUT
// ======================================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ======================================================
// ASK QUESTION
// ======================================================

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// ======================================================
// CREATE ADMIN
// ======================================================

async function createAdmin() {
  try {
    console.log("");
    console.log("======================================");
    console.log("   DOCUMENT CONTROL - CREATE ADMIN");
    console.log("======================================");
    console.log("");

    // --------------------------------------------------
    // USER DETAILS
    // --------------------------------------------------

    const name = await ask("Admin name: ");
    const email = await ask("Admin email: ");
    const password = await ask("Admin password: ");

    // --------------------------------------------------
    // VALIDATION
    // --------------------------------------------------

    if (!name) {
      throw new Error("Admin name is required");
    }

    if (!email) {
      throw new Error("Admin email is required");
    }

    if (!password) {
      throw new Error("Admin password is required");
    }

    if (password.length < 8) {
      throw new Error(
        "Password must contain at least 8 characters"
      );
    }

    // --------------------------------------------------
    // CHECK EXISTING USER
    // --------------------------------------------------

    const existingUser = await pool.query(
      `
        SELECT id, email
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `,
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error(
        `A user with email ${email} already exists`
      );
    }

    // --------------------------------------------------
    // HASH PASSWORD
    // --------------------------------------------------

    const passwordHash = await bcrypt.hash(
      password,
      12
    );

    // --------------------------------------------------
    // INSERT ADMIN
    // --------------------------------------------------

    const result = await pool.query(
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
          created_at
      `,
      [
        name,
        email,
        passwordHash,
        "admin",
      ]
    );

    const admin = result.rows[0];

    // --------------------------------------------------
    // SUCCESS
    // --------------------------------------------------

    console.log("");
    console.log("======================================");
    console.log(" Admin created successfully");
    console.log("======================================");
    console.log("");

    console.log("ID:", admin.id);
    console.log("Name:", admin.name);
    console.log("Email:", admin.email);
    console.log("Role:", admin.role);
    console.log("Active:", admin.is_active);
    console.log("");

  } catch (error) {
    console.error("");
    console.error("Failed to create admin:");
    console.error(error.message);
    console.error("");

  } finally {
    rl.close();
    await pool.end();
  }
}

// ======================================================
// RUN SCRIPT
// ======================================================

createAdmin();