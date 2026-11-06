require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function setupAdmin() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD } = process.env;
  const email = (ADMIN_EMAIL || '').trim().toLowerCase();

  if (!ADMIN_NAME || !ADMIN_NAME.trim() || !email || !ADMIN_PHONE || !ADMIN_PASSWORD) {
    throw new Error('Set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, and ADMIN_PASSWORD in .env.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL must be a valid email address.');
  }
  if (!/^\d{10}$/.test(ADMIN_PHONE)) {
    throw new Error('ADMIN_PHONE must contain exactly 10 digits.');
  }
  if (ADMIN_PASSWORD.length < 4) {
    throw new Error('ADMIN_PASSWORD must be at least 4 characters long.');
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sainath_bus_reservation'
  });

  try {
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM passengers LIKE 'role'"
    );
    if (columns.length === 0) {
      await connection.query(
        "ALTER TABLE passengers ADD COLUMN role ENUM('MEMBER', 'ADMIN') NOT NULL DEFAULT 'MEMBER' AFTER password_hash"
      );
    }

    const [busColumns] = await connection.query(
      "SHOW COLUMNS FROM buses LIKE 'is_active'"
    );
    if (busColumns.length === 0) {
      await connection.query(
        'ALTER TABLE buses ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER travel_date'
      );
    }

    const [users] = await connection.execute(
      'SELECT passenger_id FROM passengers WHERE email = ?',
      [email]
    );

    if (users.length > 0) {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await connection.execute(
        "UPDATE passengers SET role = 'ADMIN', password_hash = ? WHERE passenger_id = ?",
        [passwordHash, users[0].passenger_id]
      );
      console.log(`Promoted the existing account ${email} to ADMIN and updated its password.`);
    } else {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await connection.execute(
        "INSERT INTO passengers (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'ADMIN')",
        [ADMIN_NAME.trim(), email, ADMIN_PHONE, passwordHash]
      );
      console.log(`Created the administrator account ${email}.`);
    }
  } finally {
    await connection.end();
  }
}

setupAdmin().catch(error => {
  console.error('Admin setup failed:', error.message);
  process.exitCode = 1;
});
