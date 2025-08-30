import dotenv from 'dotenv';
import { Knex } from 'knex';

dotenv.config();

interface KnexConfig {
  [key: string]: Knex.Config;
}

const config: KnexConfig = {
  development: {
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
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
    seeds: {
      directory: './src/seeds',
      loadExtensions: ['.ts'],
    },
    debug: process.env['NODE_ENV'] === 'development',
  },

  test: {
    client: 'postgresql',
    connection: {
      host: process.env['TEST_DB_HOST'] || 'localhost',
      port: parseInt(process.env['TEST_DB_PORT'] || '5432'),
      database: process.env['TEST_DB_NAME'] || 'buzz_platform_test',
      user: process.env['TEST_DB_USER'] || 'postgres',
      password: process.env['TEST_DB_PASSWORD'] || 'password',
      ssl: false,
    },
    pool: {
      min: 1,
      max: 5,
    },
    migrations: {
      directory: './src/migrations',
      tableName: 'knex_migrations',
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
    seeds: {
      directory: './src/seeds',
      loadExtensions: ['.ts'],
    },
  },

  staging: {
    client: 'postgresql',
    connection: {
      connectionString: process.env['DATABASE_URL'],
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: parseInt(process.env['DB_POOL_MIN'] || '2'),
      max: parseInt(process.env['DB_POOL_MAX'] || '20'),
    },
    migrations: {
      directory: './dist/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './dist/seeds',
    },
  },

  production: {
    client: 'postgresql',
    connection: {
      connectionString: process.env['DATABASE_URL'],
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: parseInt(process.env['DB_POOL_MIN'] || '5'),
      max: parseInt(process.env['DB_POOL_MAX'] || '50'),
    },
    migrations: {
      directory: './dist/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './dist/seeds',
    },
  },
};

export default config;