#!/usr/bin/env node
/**
 * Seed Data Runner
 *
 * Generates a valid bcrypt hash for "TestPass1", patches the SQL seed script,
 * and executes it against the database.
 *
 * Usage:
 *   node scripts/seed-data.mjs                    # uses .env defaults
 *   DB_HOST=localhost DB_PORT=5432 node scripts/seed-data.mjs   # override
 *
 * Or run the SQL directly if you trust the embedded hash:
 *   docker exec -i alpacaparty_db psql -U alpaca -d alpacaparty_db < scripts/seed-data.sql
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createHash } from 'crypto';

// Try to load dotenv if available
try {
  const dotenv = await import('dotenv');
  dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') });
} catch { /* dotenv not installed, use env vars directly */ }

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  // Dynamic import pg
  const { default: pg } = await import('pg');
  const { Pool } = pg;

  // Dynamic import bcrypt to generate a real hash
  let passwordHash;
  try {
    const bcrypt = await import('bcrypt');
    passwordHash = await bcrypt.default.hash('TestPass1', 12);
    console.log('Generated fresh bcrypt hash for "TestPass1"');
  } catch {
    // Fallback to the pre-computed hash in the SQL file
    passwordHash = '$2b$12$LJ3m4ys3LzQVKoEBOBMxnOxQzUKBCfJBQ3.DYcFqB.qnGEjSqZYSy';
    console.log('Using pre-computed bcrypt hash (bcrypt not available)');
  }

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'alpacaparty_db',
    user: process.env.DB_USER || 'alpaca',
    password: process.env.DB_PASSWORD || 'alpaca',
  });

  try {
    // Read and patch the SQL file with the real hash
    let sql = readFileSync(join(__dirname, 'seed-data.sql'), 'utf-8');
    sql = sql.replace(
      /\$2b\$12\$LJ3m4ys3LzQVKoEBOBMxnOxQzUKBCfJBQ3\.DYcFqB\.qnGEjSqZYSy/g,
      passwordHash.replace(/\$/g, '$$$$') // escape $ for SQL
    );

    console.log('Executing seed data script...');
    console.log('Database:', `${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'alpacaparty_db'}`);

    await pool.query(sql);

    console.log('\nSeed data inserted successfully!');
    console.log('All users have the password: TestPass1');
    console.log('Admin users: user_1, user_2, user_3');

    // Print summary
    const tables = [
      'users', 'friend_requests', 'friends', 'blocked_users', 'messages',
      'chat_rooms', 'chat_room_members', 'chat_room_messages', 'posts',
      'post_likes', 'games',
      'game_stats', 'user_achievements', 'daily_challenges', 'notifications',
      'alpaca_farms'
    ];

    console.log('\n=== Seed Data Summary ===');
    for (const table of tables) {
      const { rows } = await pool.query(`SELECT COUNT(*) AS count FROM ${table}`);
      console.log(`  ${table.padEnd(22)} ${rows[0].count}`);
    }
    console.log('=========================');

  } catch (err) {
    console.error('Error seeding data:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
