const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

const pool = require("../src/config/database");

// ======================================================
// CONFIGURATION
// ======================================================

const MIGRATIONS_DIR = path.resolve(
  __dirname,
  "../../database/migrations"
);

// ======================================================
// GET MIGRATION FILES
// ======================================================

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(
      `Migrations directory not found: ${MIGRATIONS_DIR}`
    );
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => /^\d+_.+\.sql$/i.test(file))
    .sort();
}

// ======================================================
// CREATE MIGRATION TABLE
// ======================================================

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

// ======================================================
// GET APPLIED MIGRATIONS
// ======================================================

async function getAppliedMigrations(client) {
  const result = await client.query(`
    SELECT migration_name
    FROM schema_migrations
    ORDER BY migration_name
  `);

  return new Set(
    result.rows.map((row) => row.migration_name)
  );
}

// ======================================================
// BASELINE EXISTING DATABASE
// ======================================================

async function baseline() {
  const client = await pool.connect();

  try {
    console.log("");
    console.log("======================================");
    console.log(" DOCUMENT CONTROL - MIGRATION BASELINE");
    console.log("======================================");
    console.log("");

    await client.query("BEGIN");

    await ensureMigrationTable(client);

    const migrationFiles = getMigrationFiles();

    if (migrationFiles.length === 0) {
      throw new Error("No migration files found");
    }

    const appliedMigrations =
      await getAppliedMigrations(client);

    for (const migrationName of migrationFiles) {
      if (appliedMigrations.has(migrationName)) {
        console.log(`Already tracked: ${migrationName}`);
        continue;
      }

      await client.query(
        `
          INSERT INTO schema_migrations
          (migration_name)
          VALUES ($1)
        `,
        [migrationName]
      );

      console.log(`Baselined: ${migrationName}`);
    }

    await client.query("COMMIT");

    console.log("");
    console.log("Baseline completed successfully.");
    console.log("");
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("");
    console.error("Baseline failed:");
    console.error(error.message);
    console.error("");

    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

// ======================================================
// RUN PENDING MIGRATIONS
// ======================================================

async function migrate() {
  const client = await pool.connect();

  try {
    console.log("");
    console.log("======================================");
    console.log(" DOCUMENT CONTROL - DATABASE MIGRATION");
    console.log("======================================");
    console.log("");

    await ensureMigrationTable(client);

    const migrationFiles = getMigrationFiles();

    if (migrationFiles.length === 0) {
      console.log("No migration files found.");
      return;
    }

    const appliedMigrations =
      await getAppliedMigrations(client);

    let appliedCount = 0;

    for (const migrationName of migrationFiles) {
      if (appliedMigrations.has(migrationName)) {
        console.log(`Already applied: ${migrationName}`);
        continue;
      }

      const migrationPath = path.join(
        MIGRATIONS_DIR,
        migrationName
      );

      const sql = fs.readFileSync(
        migrationPath,
        "utf8"
      );

      console.log("");
      console.log(`Applying: ${migrationName}`);

      try {
        await client.query("BEGIN");

        await client.query(sql);

        await client.query(
          `
            INSERT INTO schema_migrations
            (migration_name)
            VALUES ($1)
          `,
          [migrationName]
        );

        await client.query("COMMIT");

        console.log(
          `Applied successfully: ${migrationName}`
        );

        appliedCount++;
      } catch (error) {
        await client.query("ROLLBACK");

        throw new Error(
          `Migration failed: ${migrationName}\n${error.message}`
        );
      }
    }

    console.log("");
    console.log("======================================");
    console.log(" MIGRATION COMPLETE");
    console.log("======================================");
    console.log(`New migrations applied: ${appliedCount}`);
    console.log("");
  } catch (error) {
    console.error("");
    console.error("Migration failed:");
    console.error(error.message);
    console.error("");

    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

// ======================================================
// COMMAND
// ======================================================

const command = process.argv[2];

if (command === "--baseline") {
  baseline();
} else {
  migrate();
}