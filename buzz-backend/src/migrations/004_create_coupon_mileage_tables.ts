import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Coupon templates
  await knex.schema.createTable('coupons', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 200).notNullable();
    table.enum('type', ['signup', 'referral', 'event', 'basic']).notNullable();
    table.enum('discount_type', ['fixed', 'percentage']).notNullable();
    table.decimal('discount_value', 10, 2).notNullable();
    table.decimal('min_purchase_amount', 10, 2);
    table.decimal('max_discount_amount', 10, 2);
    table.date('valid_from');
    table.date('valid_until');
    table.integer('total_quantity');
    table.integer('used_quantity').defaultTo(0);
    table.specificType('applicable_businesses', 'uuid[]'); // Array of business IDs
    table.enum('status', ['active', 'inactive']).defaultTo('active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // User coupons
  await knex.schema.createTable('user_coupons', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.uuid('coupon_id').notNullable().references('id').inTable('coupons');
    table.timestamp('issued_at').defaultTo(knex.fn.now());
    table.timestamp('used_at');
    table.uuid('used_business_id').references('id').inTable('businesses');
    table.decimal('used_amount', 10, 2);
    table.timestamp('expires_at').notNullable();
    table.enum('status', ['active', 'used', 'expired']).defaultTo('active');
    table.text('qr_code_data').unique();

    // Indexes
    table.index(['user_id'], 'idx_user_coupons_user_id');
    table.index(['status'], 'idx_user_coupons_status');
    table.index(['expires_at'], 'idx_user_coupons_expires_at');
    table.index(['qr_code_data'], 'idx_user_coupons_qr_code_data');
  });

  // Mileage accounts
  await knex.schema.createTable('mileage_accounts', (table) => {
    table.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');
    table.decimal('balance', 10, 2).defaultTo(0).checkPositive();
    table.decimal('total_earned', 10, 2).defaultTo(0);
    table.decimal('total_used', 10, 2).defaultTo(0);
    table.decimal('total_expired', 10, 2).defaultTo(0);
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Mileage transactions
  await knex.schema.createTable('mileage_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.uuid('business_id').references('id').inTable('businesses');
    table.enum('type', ['earn', 'use', 'expire', 'cancel', 'refund']).notNullable();
    table.decimal('amount', 10, 2).notNullable();
    table.decimal('balance_before', 10, 2).notNullable();
    table.decimal('balance_after', 10, 2).notNullable();
    table.text('description');
    table.string('reference_type', 50);
    table.uuid('reference_id');
    table.timestamp('expires_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['user_id'], 'idx_mileage_transactions_user_id');
    table.index(['business_id'], 'idx_mileage_transactions_business_id');
    table.index(['type'], 'idx_mileage_transactions_type');
    table.index(['created_at'], 'idx_mileage_transactions_created_at');
  });

  // QR codes
  await knex.schema.createTable('qr_codes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users');
    table.uuid('business_id').references('id').inTable('businesses');
    table.enum('type', ['coupon', 'mileage', 'event']).notNullable();
    table.uuid('reference_id');
    table.text('qr_data').notNullable().unique();
    table.timestamp('expires_at');
    table.timestamp('scanned_at');
    table.uuid('scanned_by_business_id').references('id').inTable('businesses');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['user_id'], 'idx_qr_codes_user_id');
    table.index(['qr_data'], 'idx_qr_codes_qr_data');
    table.index(['expires_at'], 'idx_qr_codes_expires_at');
  });

  // QR events
  await knex.schema.createTable('qr_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 200).notNullable();
    table.text('description');
    table.integer('total_qr_count').notNullable();
    table.integer('scanned_count').defaultTo(0);
    table.integer('win_count').defaultTo(0);
    table.jsonb('prize_config').notNullable(); // prize configuration
    table.decimal('budget_limit', 10, 2).notNullable();
    table.decimal('budget_used', 10, 2).defaultTo(0);
    table.jsonb('distribution_channels'); // distribution channels
    table.timestamp('starts_at').notNullable();
    table.timestamp('ends_at').notNullable();
    table.enum('status', ['planned', 'active', 'paused', 'completed']).defaultTo('planned');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // QR event participations
  await knex.schema.createTable('qr_event_participations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('qr_event_id').notNullable().references('id').inTable('qr_events');
    table.uuid('user_id').references('id').inTable('users');
    table.text('qr_code').notNullable();
    table.timestamp('scanned_at').defaultTo(knex.fn.now());
    table.boolean('is_winner').defaultTo(false);
    table.integer('prize_rank');
    table.decimal('prize_amount', 10, 2);
    table.inet('ip_address');
    table.text('user_agent');

    // Indexes
    table.index(['qr_event_id'], 'idx_qr_event_participations_qr_event_id');
  });

  // Performance indexes
  await knex.raw(`
    CREATE INDEX idx_user_coupons_active 
    ON user_coupons(user_id, status, expires_at) 
    WHERE status = 'active'
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('qr_event_participations');
  await knex.schema.dropTableIfExists('qr_events');
  await knex.schema.dropTableIfExists('qr_codes');
  await knex.schema.dropTableIfExists('mileage_transactions');
  await knex.schema.dropTableIfExists('mileage_accounts');
  await knex.schema.dropTableIfExists('user_coupons');
  await knex.schema.dropTableIfExists('coupons');
}