import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function createDefaultUser(client) {
  try {
    // Check if admin user already exists
    const checkUser = await client.query(
      'SELECT * FROM auth.users WHERE username = $1',
      ['admin']
    );

    if (checkUser.rows.length === 0) {
      // Create default admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await client.query(
        `INSERT INTO auth.users (username, email, password_hash, role, department_name)
         VALUES ($1, $2, $3, $4, $5)`,
        ['admin', 'admin@primetech.com', hashedPassword, 'admin', 'Administration']
      );
      console.log('Default admin user created successfully!');
    } else {
      console.log('Admin user already exists, skipping creation.');
    }
  } catch (err) {
    console.error('Error creating default user:', err);
    throw err;
  }
}

async function initDatabase() {
  const client = await pool.connect();
  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    // Split the schema into individual statements
    const statements = schemaSQL
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    // Execute each statement separately
    for (const statement of statements) {
      try {
        await client.query(statement);
        console.log('Executed statement successfully');
      } catch (err) {
        // Log the error but continue with other statements
        console.error('Error executing statement:', err.message);
        console.error('Statement:', statement);
      }
    }

    // Create default admin user
    await createDefaultUser(client);

    console.log('Database initialization completed!');
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

initDatabase().catch(err => {
  console.error('Fatal error during database initialization:', err);
  process.exit(1);
}); 