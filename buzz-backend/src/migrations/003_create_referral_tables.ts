import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Referral visit tracking
  await knex.schema.createTable('referral_visits', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('referral_code', 20).notNullable();
    table.inet('visitor_ip');
    table.text('user_agent');
    table.text('referer_url');
    table.string('utm_source', 100);
    table.string('utm_medium', 100);
    table.string('utm_campaign', 100);
    table.string('device_type', 20);
    table.string('browser', 50);
    table.timestamp('visited_at').defaultTo(knex.fn.now());
    table.timestamp('converted_at');
    table.uuid('converted_user_id').references('id').inTable('users');

    // Indexes
    table.index(['referral_code'], 'idx_referral_visits_referral_code');
    table.index(['converted_user_id'], 'idx_referral_visits_converted_user_id');
    table.index(['visited_at'], 'idx_referral_visits_visited_at');
  });

  // Referral rewards
  await knex.schema.createTable('referral_rewards', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('referrer_id').notNullable().references('id').inTable('users');
    table.uuid('referred_user_id').references('id').inTable('users');
    table.enum('reward_type', ['mileage', 'coupon']);
    table.decimal('reward_amount', 10, 2).notNullable();
    table.enum('status', ['pending', 'paid', 'cancelled']).defaultTo('pending');
    table.timestamp('paid_at');
    table.timestamp('cancelled_at');
    table.text('cancellation_reason');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['referrer_id'], 'idx_referral_rewards_referrer_id');
    table.index(['status'], 'idx_referral_rewards_status');
  });

  // Referral performance stats (리퍼럴 성과 통계)
  await knex.schema.createTable('referral_stats', (table) => {
    table.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');
    table.integer('total_visits').defaultTo(0);
    table.integer('total_conversions').defaultTo(0);
    table.decimal('conversion_rate', 5, 2).defaultTo(0);
    table.decimal('total_rewards', 10, 2).defaultTo(0);
    table.integer('monthly_rank');
    table.timestamp('last_calculated_at').defaultTo(knex.fn.now());
  });

  // Performance index for referral visits with conversions
  await knex.raw(`
    CREATE INDEX idx_referral_performance 
    ON referral_visits(referral_code, converted_at) 
    WHERE converted_at IS NOT NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('referral_stats');
  await knex.schema.dropTableIfExists('referral_rewards');
  await knex.schema.dropTableIfExists('referral_visits');
}