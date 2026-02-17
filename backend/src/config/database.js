/**
 * PostgreSQL Database Connection
 * @owner DavidPoetsch, ValGSgit
 * @issue https://github.com/ValGSgit/Cleanscendence/issues/7
 *
 * Uses the 'pg' driver with a connection pool.
 * Tables are initialised in PostgreSQL/init.sql (Issue #10).
 */
import pg from 'pg';
import config from './index.js';

const { Pool } = pg;

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  max: 20,               // max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err);
});

/**
 * Helper — run a query and return rows.
 * Usage: const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Helper — get a client for transactions.
 */
export const getClient = () => pool.connect();

export default pool;
