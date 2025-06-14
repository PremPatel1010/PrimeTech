import { pool } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyNotificationTriggers() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');

    // Read and execute the trigger SQL file
    const triggerSQL = fs.readFileSync(
      path.join(__dirname, '../database/triggers/notification_triggers.sql'),
      'utf8'
    );

    // Split the SQL file into individual statements
    const statements = triggerSQL
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    // Execute each statement
    for (const statement of statements) {
      await client.query(statement);
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('Successfully applied notification triggers');

  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error applying notification triggers:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
applyNotificationTriggers()
  .then(() => {
    console.log('Notification triggers setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to setup notification triggers:', error);
    process.exit(1);
  }); 