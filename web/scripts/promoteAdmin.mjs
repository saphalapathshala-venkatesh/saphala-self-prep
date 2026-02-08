import pg from "pg";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/promoteAdmin.mjs <email>");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const result = await pool.query(
    'UPDATE "User" SET role = $1 WHERE email = $2 RETURNING id, email, role',
    ["ADMIN", email]
  );

  if (result.rowCount === 0) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  const user = result.rows[0];
  console.log(`Promoted user ${user.id} (${user.email}) to role: ${user.role}`);
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
} finally {
  await pool.end();
}
