import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable UUID and crypto extensions
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  // Users table (core user information)
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email', 255).notNullable().unique();
    table.string('phone', 20).unique();
    table.string('name', 100).notNullable();
    table.enum('role', ['user', 'business', 'admin']).defaultTo('user');
    table.enum('auth_provider', ['google', 'kakao', 'email']);
    table.string('provider_id', 255);
    table.text('avatar_url');
    table.boolean('is_active').defaultTo(true);
    table.text('password_hash');
    table.boolean('must_change_password').defaultTo(false);
    table.uuid('created_by').references('id').inTable('users');
    table.timestamp('last_login_at');
    table.integer('login_count').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at');

    // Indexes
    table.index(['email'], 'idx_users_email');
    table.index(['phone'], 'idx_users_phone');
    table.index(['role'], 'idx_users_role');
    table.index(['is_active'], 'idx_users_is_active');
    table.index(['auth_provider'], 'idx_users_auth_provider');
    table.index(['provider_id'], 'idx_users_provider_id');
  });

  // User profiles (extended user information)
  await knex.schema.createTable('user_profiles', (table) => {
    table.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');
    table.date('birth_date');
    table.enum('gender', ['male', 'female', 'other']);
    table.string('university', 100);
    table.string('referral_code', 20).notNullable().unique();
    table.uuid('referrer_id').references('id').inTable('users');
    table.boolean('marketing_agree').defaultTo(false);
    table.timestamp('terms_agreed_at').notNullable();
    table.timestamp('privacy_agreed_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['referral_code'], 'idx_user_profiles_referral_code');
    table.index(['referrer_id'], 'idx_user_profiles_referrer_id');
  });

  // Admin roles (관리자 역할 정의)
  await knex.schema.createTable('admin_roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 50).notNullable().unique();
    table.string('display_name', 100).notNullable();
    table.integer('level').notNullable(); // 권한 레벨
    table.jsonb('permissions').notNullable(); // 세부 권한 정의
    table.text('description');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // User admin roles (사용자-역할 매핑)
  await knex.schema.createTable('user_admin_roles', (table) => {
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.uuid('role_id').references('id').inTable('admin_roles').onDelete('CASCADE');
    table.timestamp('assigned_at').defaultTo(knex.fn.now());
    table.uuid('assigned_by').references('id').inTable('users');
    table.timestamp('expires_at');
    table.primary(['user_id', 'role_id']);
  });

  // Business applications (Buzz-Biz 가입 신청)
  await knex.schema.createTable('business_applications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email', 255).notNullable().unique();
    table.text('password_hash').notNullable();
    table.jsonb('business_info').notNullable(); // business details
    table.jsonb('documents'); // 첨부 서류 URLs
    table.enum('status', ['pending', 'approved', 'rejected', 'expired']).defaultTo('pending');
    table.uuid('reviewed_by').references('id').inTable('users');
    table.timestamp('reviewed_at');
    table.text('rejection_reason');
    table.uuid('approved_user_id').references('id').inTable('users');
    table.timestamp('expires_at').defaultTo(knex.raw("NOW() + INTERVAL '30 days'"));
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['status'], 'idx_business_applications_status');
    table.index(['email'], 'idx_business_applications_email');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('business_applications');
  await knex.schema.dropTableIfExists('user_admin_roles');
  await knex.schema.dropTableIfExists('admin_roles');
  await knex.schema.dropTableIfExists('user_profiles');
  await knex.schema.dropTableIfExists('users');
}