const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'goal_tracker',
});

(async () => {
  try {
    const hash = await bcrypt.hash('password123', 10);
    await pool.query(
      `UPDATE users SET password = $1 WHERE email IN ($2, $3, $4)`,
      [hash, 'employee@example.com', 'manager@example.com', 'admin@example.com']
    );
    console.log('✅ Passwords updated successfully');
    console.log('New hash:', hash);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
})();