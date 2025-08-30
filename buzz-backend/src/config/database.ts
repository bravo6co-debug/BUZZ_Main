import { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Database configuration
 */
export const dbConfig: Knex.Config = {
  client: 'postgresql',
  connection: {
    host: process.env['DB_HOST'] || 'localhost',
    port: parseInt(process.env['DB_PORT'] || '5432'),
    database: process.env['DB_NAME'] || 'buzz_platform',
    user: process.env['DB_USER'] || 'postgres',
    password: process.env['DB_PASSWORD'] || 'password',
    ssl: process.env['DB_SSL'] === 'true' ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: parseInt(process.env['DB_POOL_MIN'] || '2'),
    max: parseInt(process.env['DB_POOL_MAX'] || '20'),
  },
  migrations: {
    directory: './src/migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './src/seeds',
  },
  acquireConnectionTimeout: 60000,
};

export default dbConfig;