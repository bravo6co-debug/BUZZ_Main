import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Settlement requests
  await knex.schema.createTable('settlement_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('business_id').notNullable().references('id').inTable('businesses');
    table.date('settlement_date').notNullable();
    table.integer('coupon_count').defaultTo(0);
    table.decimal('coupon_amount', 10, 2).defaultTo(0);
    table.integer('mileage_count').defaultTo(0);
    table.decimal('mileage_amount', 10, 2).defaultTo(0);
    table.decimal('total_amount', 10, 2).notNullable();
    table.string('bank_name', 50);
    table.string('bank_account', 50);
    table.enum('status', ['pending', 'approved', 'rejected', 'paid']).defaultTo('pending');
    table.timestamp('requested_at').defaultTo(knex.fn.now());
    table.timestamp('approved_at');
    table.uuid('approved_by').references('id').inTable('users');
    table.timestamp('paid_at');
    table.text('rejection_reason');
    table.text('admin_note');
    table.unique(['business_id', 'settlement_date']);

    // Indexes
    table.index(['business_id'], 'idx_settlement_requests_business_id');
    table.index(['status'], 'idx_settlement_requests_status');
    table.index(['settlement_date'], 'idx_settlement_requests_settlement_date');
  });

  // Settlement details
  await knex.schema.createTable('settlement_details', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('settlement_request_id').notNullable().references('id').inTable('settlement_requests').onDelete('CASCADE');
    table.enum('transaction_type', ['coupon', 'mileage']).notNullable();
    table.uuid('transaction_id').notNullable();
    table.decimal('amount', 10, 2).notNullable();
    table.string('customer_name', 100);
    table.timestamp('transaction_at').notNullable();

    // Indexes
    table.index(['settlement_request_id'], 'idx_settlement_details_settlement_request_id');
  });

  // Budget settings
  await knex.schema.createTable('budget_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('year_month', 7).unique().notNullable(); // 'YYYY-MM'
    table.decimal('total_budget', 12, 2).notNullable();
    table.decimal('referral_budget', 10, 2).notNullable();
    table.decimal('coupon_budget', 10, 2).notNullable();
    table.decimal('event_budget', 10, 2).notNullable();
    table.decimal('settlement_budget', 10, 2).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('users');

    // Indexes
    table.index(['year_month'], 'idx_budget_settings_year_month');
  });

  // Budget executions
  await knex.schema.createTable('budget_executions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('budget_setting_id').notNullable().references('id').inTable('budget_settings');
    table.string('category', 50).notNullable();
    table.decimal('amount', 10, 2).notNullable();
    table.text('description');
    table.string('reference_type', 50);
    table.uuid('reference_id');
    table.timestamp('executed_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['budget_setting_id'], 'idx_budget_executions_budget_setting_id');
    table.index(['executed_at'], 'idx_budget_executions_executed_at');
  });

  // Budget control rules
  await knex.schema.createTable('budget_controls', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('control_type', 50).notNullable();
    table.integer('threshold_percentage').notNullable();
    table.string('action', 100).notNullable();
    table.jsonb('action_params');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Budget alerts
  await knex.schema.createTable('budget_alerts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('budget_setting_id').notNullable().references('id').inTable('budget_settings');
    table.string('alert_type', 50).notNullable();
    table.enum('alert_level', ['info', 'warning', 'danger', 'critical']);
    table.text('message').notNullable();
    table.boolean('is_read').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['is_read'], 'idx_budget_alerts_is_read');
  });

  // Performance indexes
  await knex.raw(`
    CREATE INDEX idx_settlement_pending 
    ON settlement_requests(status, business_id) 
    WHERE status = 'pending'
  `);

  await knex.raw(`
    CREATE INDEX idx_budget_current 
    ON budget_executions(budget_setting_id, executed_at)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('budget_alerts');
  await knex.schema.dropTableIfExists('budget_controls');
  await knex.schema.dropTableIfExists('budget_executions');
  await knex.schema.dropTableIfExists('budget_settings');
  await knex.schema.dropTableIfExists('settlement_details');
  await knex.schema.dropTableIfExists('settlement_requests');
}