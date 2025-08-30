import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Business information
  await knex.schema.createTable('businesses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('owner_id').notNullable().references('id').inTable('users');
    table.string('business_name', 200).notNullable();
    table.string('business_number', 20).unique();
    table.string('category', 50).notNullable();
    table.text('description');
    table.text('address').notNullable();
    table.text('address_detail');
    table.decimal('latitude', 10, 8);
    table.decimal('longitude', 11, 8);
    table.string('phone', 20);
    table.jsonb('business_hours');
    table.jsonb('images');
    table.specificType('tags', 'text[]');
    table.enum('status', ['pending', 'approved', 'suspended', 'rejected']).defaultTo('pending');
    table.timestamp('approved_at');
    table.uuid('approved_by').references('id').inTable('users');
    table.timestamp('suspended_at');
    table.text('suspension_reason');
    table.integer('qr_scan_count').defaultTo(0);
    table.decimal('avg_rating', 2, 1).defaultTo(0);
    table.integer('review_count').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['owner_id'], 'idx_businesses_owner_id');
    table.index(['status'], 'idx_businesses_status');
    table.index(['category'], 'idx_businesses_category');
  });

  // Business exposure tracking (노출 공평성 관리 개선)
  await knex.schema.createTable('business_exposures', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('business_id').notNullable().references('id').inTable('businesses').onDelete('CASCADE');
    table.date('exposure_date').notNullable();
    table.integer('exposure_count').defaultTo(0);
    table.integer('click_count').defaultTo(0);
    table.integer('main_exposure_count').defaultTo(0);
    table.integer('category_exposure_count').defaultTo(0);
    table.integer('search_exposure_count').defaultTo(0);
    table.integer('rotation_slot'); // 로테이션 순서
    table.timestamp('last_main_exposure'); // 마지막 메인 노출 시간
    table.integer('guaranteed_exposure_count').defaultTo(0); // 보장 노출 횟수
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['business_id', 'exposure_date']);

    // Indexes
    table.index(['business_id', 'exposure_date'], 'idx_business_exposures_business_date');
    table.index(['rotation_slot'], 'idx_business_exposures_rotation_slot');
  });

  // Business reviews
  await knex.schema.createTable('business_reviews', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('business_id').notNullable().references('id').inTable('businesses').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.integer('rating').notNullable().checkBetween([1, 5]);
    table.text('content');
    table.jsonb('images');
    table.boolean('is_verified_purchase').defaultTo(false);
    table.integer('like_count').defaultTo(0);
    table.boolean('is_hidden').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['business_id'], 'idx_business_reviews_business_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('business_reviews');
  await knex.schema.dropTableIfExists('business_exposures');
  await knex.schema.dropTableIfExists('businesses');
}