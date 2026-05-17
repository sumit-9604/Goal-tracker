const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');

async function init() {
  // Connect to default 'postgres' database
  const adminPool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres',
  });

  try {
    await adminPool.query('CREATE DATABASE goal_tracker');
    console.log('✅ Database "goal_tracker" created');
  } catch (err) {
    if (err.code === '42P04') console.log('ℹ️ Database already exists');
    else throw err;
  }
  await adminPool.end();

  // Connect to goal_tracker and run schema
  const goalPool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'goal_tracker',
  });

  const sql = fs.readFileSync('./database.sql', 'utf8');
  await goalPool.query(sql);
  console.log('✅ Tables and sample data created');
  await goalPool.end();
}

init().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});