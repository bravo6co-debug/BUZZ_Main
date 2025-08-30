import knex, { Knex } from 'knex';
import { dbConfig } from './database';

let db: Knex;

/**
 * Initialize database connection
 */
export const initDatabase = (): Knex => {
  if (!db) {
    db = knex(dbConfig);
  }
  return db;
};

/**
 * Get database instance
 */
export const getDatabase = (): Knex => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

/**
 * Close database connection
 */
export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.destroy();
  }
};

export default { initDatabase, getDatabase, closeDatabase };