
const bcrypt = require('bcrypt');
const pool = require('../config/db');

async function seed() {
  try {
    const email = 'cfo@org.com';
    const password = 'CFO#ORG@April2026';
    const role = 'CFO';
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
      [email, passwordHash, role]
    );
    
    console.log('✅ Seeding successful! CFO account created.');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
