import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Events
  await knex.schema.createTable('events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('title', 200).notNullable();
    table.text('description');
    table.string('event_type', 50).notNullable();
    table.text('banner_image');
    table.jsonb('detail_images');
    table.jsonb('benefit_config'); // benefit configuration
    table.integer('participant_count').defaultTo(0);
    table.integer('participant_limit');
    table.timestamp('starts_at').notNullable();
    table.timestamp('ends_at').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('users');
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['is_active'], 'idx_events_is_active');
    table.index(['starts_at'], 'idx_events_starts_at');
  });

  // Event participations
  await knex.schema.createTable('event_participations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('event_id').notNullable().references('id').inTable('events');
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.timestamp('participated_at').defaultTo(knex.fn.now());
    table.string('reward_type', 50);
    table.decimal('reward_amount', 10, 2);
    table.timestamp('reward_issued_at');
    table.unique(['event_id', 'user_id']);

    // Indexes
    table.index(['event_id'], 'idx_event_participations_event_id');
  });

  // Notifications
  await knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.string('type', 50).notNullable();
    table.string('title', 200).notNullable();
    table.text('message').notNullable();
    table.jsonb('data');
    table.boolean('is_read').defaultTo(false);
    table.timestamp('read_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['user_id'], 'idx_notifications_user_id');
    table.index(['is_read'], 'idx_notifications_is_read');
  });

  // Push tokens
  await knex.schema.createTable('push_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.text('token').notNullable().unique();
    table.enum('platform', ['ios', 'android', 'web']);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['user_id'], 'idx_push_tokens_user_id');
  });

  // Audit logs
  await knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users');
    table.string('action', 100).notNullable();
    table.string('entity_type', 50);
    table.uuid('entity_id');
    table.jsonb('old_values');
    table.jsonb('new_values');
    table.inet('ip_address');
    table.text('user_agent');
    table.string('session_id', 100);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['user_id'], 'idx_audit_logs_user_id');
    table.index(['entity_type', 'entity_id'], 'idx_audit_logs_entity');
    table.index(['created_at'], 'idx_audit_logs_created_at');
  });

  // API logs
  await knex.schema.createTable('api_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users');
    table.string('method', 10).notNullable();
    table.text('endpoint').notNullable();
    table.jsonb('request_headers');
    table.jsonb('request_body');
    table.integer('response_status');
    table.jsonb('response_body');
    table.integer('response_time_ms');
    table.text('error_message');
    table.inet('ip_address');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['endpoint'], 'idx_api_logs_endpoint');
    table.index(['created_at'], 'idx_api_logs_created_at');
  });

  // System settings
  await knex.schema.createTable('system_settings', (table) => {
    table.string('key', 100).primary();
    table.jsonb('value').notNullable();
    table.text('description');
    table.string('category', 50).notNullable();
    table.string('data_type', 20);
    table.boolean('is_public').defaultTo(false);
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('updated_by').references('id').inTable('users');

    // Indexes
    table.index(['category'], 'idx_system_settings_category');
  });

  // Security settings
  await knex.schema.createTable('security_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('setting_type', 50).notNullable();
    table.jsonb('setting_value').notNullable();
    table.text('description');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['setting_type'], 'idx_security_settings_setting_type');
  });

  // IP blacklist
  await knex.schema.createTable('ip_blacklist', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.inet('ip_address').notNullable().unique();
    table.text('reason');
    table.timestamp('blocked_until');
    table.boolean('is_permanent').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('users');

    // Indexes
    table.index(['ip_address'], 'idx_ip_blacklist_ip_address');
  });

  // Community posts
  await knex.schema.createTable('community_posts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.enum('category', ['free', 'tip', 'review', 'qna']).notNullable();
    table.string('title', 200).notNullable();
    table.text('content').notNullable();
    table.jsonb('images');
    table.integer('view_count').defaultTo(0);
    table.integer('like_count').defaultTo(0);
    table.integer('comment_count').defaultTo(0);
    table.boolean('is_pinned').defaultTo(false);
    table.boolean('is_hidden').defaultTo(false);
    table.text('hidden_reason');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['user_id'], 'idx_community_posts_user_id');
    table.index(['category'], 'idx_community_posts_category');
    table.index(['created_at'], 'idx_community_posts_created_at');
  });

  // Community comments
  await knex.schema.createTable('community_comments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('post_id').notNullable().references('id').inTable('community_posts').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.uuid('parent_comment_id').references('id').inTable('community_comments');
    table.text('content').notNullable();
    table.boolean('is_hidden').defaultTo(false);
    table.text('hidden_reason');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['post_id'], 'idx_community_comments_post_id');
  });

  // Community reports
  await knex.schema.createTable('community_reports', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.enum('content_type', ['post', 'comment']);
    table.uuid('content_id').notNullable();
    table.uuid('reporter_id').notNullable().references('id').inTable('users');
    table.string('reason', 50).notNullable();
    table.text('description');
    table.enum('status', ['pending', 'reviewed', 'resolved', 'rejected']).defaultTo('pending');
    table.uuid('reviewed_by').references('id').inTable('users');
    table.timestamp('reviewed_at');
    table.text('action_taken');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['status'], 'idx_community_reports_status');
  });

  // Performance indexes
  await knex.raw(`
    CREATE INDEX idx_active_events 
    ON events(is_active, starts_at, ends_at) 
    WHERE is_active = true
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('community_reports');
  await knex.schema.dropTableIfExists('community_comments');
  await knex.schema.dropTableIfExists('community_posts');
  await knex.schema.dropTableIfExists('ip_blacklist');
  await knex.schema.dropTableIfExists('security_settings');
  await knex.schema.dropTableIfExists('system_settings');
  await knex.schema.dropTableIfExists('api_logs');
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('push_tokens');
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('event_participations');
  await knex.schema.dropTableIfExists('events');
}