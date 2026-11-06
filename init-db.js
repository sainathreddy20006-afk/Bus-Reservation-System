/**
 * Sainath Bus Reservation System
 * Database Initialization Script
 * Executes schema.sql directly into MySQL Workbench / MySQL Server
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function runInit() {
  console.log('---------------------------------------------------------');
  console.log('🚀 Initializing Sainath Bus Reservation Database in MySQL...');
  console.log('---------------------------------------------------------');

  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';

  console.log(`Connecting to MySQL Server on ${host}:${port} as ${user}...`);

  let connection;
  try {
    // Connect without selecting database first so we can create it
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true
    });
    console.log('✅ Connected to MySQL server.');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema.sql...');
    await connection.query(sql);

    const apSeedPath = path.join(__dirname, 'ap_routes_seed.sql');
    if (fs.existsSync(apSeedPath)) {
      console.log('Executing ap_routes_seed.sql (Andhra Pradesh routes expansion)...');
      const apSql = fs.readFileSync(apSeedPath, 'utf8');
      await connection.query(apSql);
      console.log('✅ Andhra Pradesh bus routes safely seeded!');
    }

    console.log('✅ Database `sainath_bus_reservation` created and tables populated!');

    // Verify tables
    await connection.query('USE `sainath_bus_reservation`');
    const [tables] = await connection.query('SHOW TABLES');
    console.log('📋 Verified Tables:', tables.map(t => Object.values(t)[0]));

    const [buses] = await connection.query('SELECT COUNT(*) as count FROM buses');
    console.log(`🚌 Seeded Buses count: ${buses[0].count}`);

    const [passengers] = await connection.query('SELECT COUNT(*) as count FROM passengers');
    console.log(`👤 Seeded Passengers count: ${passengers[0].count}`);

    console.log('---------------------------------------------------------');
    console.log('🎉 Database initialization complete!');
    console.log('You can now run: npm start');
    console.log('---------------------------------------------------------');
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    console.error('\nNOTE: If access is denied, please update DB_PASSWORD in your .env file.');
    console.error('Alternatively, you can open `schema.sql` directly in MySQL Workbench and execute it.');
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runInit();
