import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add missing columns to business_reviews table
  await knex.schema.alterTable('business_reviews', (table) => {
    // 리뷰 승인 상태 (관리자 검토 필요한 리뷰들)
    table.enum('status', ['pending', 'approved', 'rejected', 'hidden']).defaultTo('approved');
    
    // 신고 횟수 (욕설, 허위 정보 등으로 신고된 횟수)
    table.integer('report_count').defaultTo(0);
    
    // 도움됨 카운트 (다른 사용자들이 이 리뷰가 도움됐다고 표시한 횟수)
    table.integer('helpful_count').defaultTo(0);
    
    // 관리자 검토 관련
    table.uuid('reviewed_by').references('id').inTable('users');
    table.timestamp('reviewed_at');
    table.text('review_notes'); // 관리자 검토 메모
    
    // 추가 메타데이터
    table.text('visit_purpose'); // 방문 목적 (데이트, 회식, 혼밥 등)
    table.jsonb('tags'); // 리뷰 태그 (분위기좋음, 가성비, 친절함 등)
    table.boolean('is_photo_review').defaultTo(false); // 사진 리뷰 여부
    table.integer('visit_count').defaultTo(1); // 방문 횟수
    
    // 인덱스 추가
    table.index(['status'], 'idx_business_reviews_status');
    table.index(['report_count'], 'idx_business_reviews_report_count');
    table.index(['helpful_count'], 'idx_business_reviews_helpful_count');
    table.index(['is_photo_review'], 'idx_business_reviews_is_photo');
  });

  // 리뷰 신고 테이블 생성
  await knex.schema.createTable('review_reports', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('review_id').notNullable().references('id').inTable('business_reviews').onDelete('CASCADE');
    table.uuid('reporter_id').notNullable().references('id').inTable('users');
    table.enum('reason', [
      'inappropriate_content', // 부적절한 내용
      'fake_review', // 허위 리뷰
      'spam', // 스팸
      'offensive_language', // 욕설/비방
      'irrelevant_content', // 관련없는 내용
      'privacy_violation', // 개인정보 노출
      'other' // 기타
    ]).notNullable();
    table.text('description'); // 신고 상세 내용
    table.enum('status', ['pending', 'resolved', 'dismissed']).defaultTo('pending');
    table.uuid('handled_by').references('id').inTable('users'); // 처리한 관리자
    table.timestamp('handled_at'); // 처리 시간
    table.text('admin_notes'); // 관리자 처리 메모
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // 복합 유니크 인덱스 (한 사용자가 같은 리뷰를 중복 신고 불가)
    table.unique(['review_id', 'reporter_id']);
    
    // 인덱스
    table.index(['review_id'], 'idx_review_reports_review_id');
    table.index(['reporter_id'], 'idx_review_reports_reporter_id');
    table.index(['status'], 'idx_review_reports_status');
    table.index(['reason'], 'idx_review_reports_reason');
  });

  // 리뷰 도움됨/도움안됨 테이블
  await knex.schema.createTable('review_helpfulness', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('review_id').notNullable().references('id').inTable('business_reviews').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.boolean('is_helpful').notNullable(); // true: 도움됨, false: 도움안됨
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // 한 사용자가 한 리뷰에 대해 한 번만 평가 가능
    table.unique(['review_id', 'user_id']);
    
    // 인덱스
    table.index(['review_id'], 'idx_review_helpfulness_review_id');
    table.index(['user_id'], 'idx_review_helpfulness_user_id');
    table.index(['is_helpful'], 'idx_review_helpfulness_is_helpful');
  });

  // 리뷰 이미지 테이블 (별도 관리)
  await knex.schema.createTable('review_images', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('review_id').notNullable().references('id').inTable('business_reviews').onDelete('CASCADE');
    table.text('image_url').notNullable(); // S3 URL
    table.text('thumbnail_url'); // 썸네일 URL
    table.string('original_filename', 255);
    table.integer('file_size'); // bytes
    table.string('mime_type', 50);
    table.integer('width'); // 이미지 너비
    table.integer('height'); // 이미지 높이
    table.integer('sort_order').defaultTo(0); // 이미지 순서
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // 인덱스
    table.index(['review_id'], 'idx_review_images_review_id');
    table.index(['sort_order'], 'idx_review_images_sort_order');
  });

  // 사업자별 리뷰 통계 테이블 (성능 최적화용)
  await knex.schema.createTable('business_review_stats', (table) => {
    table.uuid('business_id').primary().references('id').inTable('businesses').onDelete('CASCADE');
    table.integer('total_reviews').defaultTo(0);
    table.integer('approved_reviews').defaultTo(0);
    table.integer('pending_reviews').defaultTo(0);
    table.decimal('avg_rating', 3, 2).defaultTo(0.00);
    table.integer('five_star_count').defaultTo(0);
    table.integer('four_star_count').defaultTo(0);
    table.integer('three_star_count').defaultTo(0);
    table.integer('two_star_count').defaultTo(0);
    table.integer('one_star_count').defaultTo(0);
    table.integer('photo_review_count').defaultTo(0);
    table.integer('total_helpful_count').defaultTo(0);
    table.timestamp('last_review_at');
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // 인덱스
    table.index(['avg_rating'], 'idx_business_review_stats_avg_rating');
    table.index(['total_reviews'], 'idx_business_review_stats_total_reviews');
  });

  // 리뷰 답글 테이블 (사업자가 리뷰에 대한 답글 작성)
  await knex.schema.createTable('review_replies', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('review_id').notNullable().references('id').inTable('business_reviews').onDelete('CASCADE');
    table.uuid('business_id').notNullable().references('id').inTable('businesses').onDelete('CASCADE');
    table.text('content').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // 한 리뷰에 대해 하나의 답글만 가능
    table.unique(['review_id']);
    
    // 인덱스
    table.index(['review_id'], 'idx_review_replies_review_id');
    table.index(['business_id'], 'idx_review_replies_business_id');
  });

  // 함수: 리뷰 통계 자동 업데이트 트리거 생성
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_business_review_stats()
    RETURNS TRIGGER AS $$
    BEGIN
      -- business_review_stats 테이블 upsert
      INSERT INTO business_review_stats (business_id, total_reviews, approved_reviews, avg_rating, 
        five_star_count, four_star_count, three_star_count, two_star_count, one_star_count,
        photo_review_count, last_review_at, updated_at)
      SELECT 
        br.business_id,
        COUNT(*) as total_reviews,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_reviews,
        ROUND(AVG(rating) FILTER (WHERE status = 'approved'), 2) as avg_rating,
        COUNT(*) FILTER (WHERE rating = 5 AND status = 'approved') as five_star_count,
        COUNT(*) FILTER (WHERE rating = 4 AND status = 'approved') as four_star_count,
        COUNT(*) FILTER (WHERE rating = 3 AND status = 'approved') as three_star_count,
        COUNT(*) FILTER (WHERE rating = 2 AND status = 'approved') as two_star_count,
        COUNT(*) FILTER (WHERE rating = 1 AND status = 'approved') as one_star_count,
        COUNT(*) FILTER (WHERE is_photo_review = true AND status = 'approved') as photo_review_count,
        MAX(created_at) as last_review_at,
        NOW() as updated_at
      FROM business_reviews br
      WHERE br.business_id = COALESCE(NEW.business_id, OLD.business_id)
      GROUP BY br.business_id
      ON CONFLICT (business_id) 
      DO UPDATE SET
        total_reviews = EXCLUDED.total_reviews,
        approved_reviews = EXCLUDED.approved_reviews,
        avg_rating = EXCLUDED.avg_rating,
        five_star_count = EXCLUDED.five_star_count,
        four_star_count = EXCLUDED.four_star_count,
        three_star_count = EXCLUDED.three_star_count,
        two_star_count = EXCLUDED.two_star_count,
        one_star_count = EXCLUDED.one_star_count,
        photo_review_count = EXCLUDED.photo_review_count,
        last_review_at = EXCLUDED.last_review_at,
        updated_at = EXCLUDED.updated_at;

      -- businesses 테이블의 avg_rating, review_count도 업데이트
      UPDATE businesses 
      SET 
        avg_rating = (SELECT avg_rating FROM business_review_stats WHERE business_id = COALESCE(NEW.business_id, OLD.business_id)),
        review_count = (SELECT approved_reviews FROM business_review_stats WHERE business_id = COALESCE(NEW.business_id, OLD.business_id)),
        updated_at = NOW()
      WHERE id = COALESCE(NEW.business_id, OLD.business_id);

      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;
  `);

  // 트리거 생성
  await knex.raw(`
    DROP TRIGGER IF EXISTS trigger_update_business_review_stats ON business_reviews;
    CREATE TRIGGER trigger_update_business_review_stats
      AFTER INSERT OR UPDATE OR DELETE ON business_reviews
      FOR EACH ROW EXECUTE FUNCTION update_business_review_stats();
  `);

  // 함수: 리뷰 도움됨 카운트 업데이트 트리거
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_review_helpful_count()
    RETURNS TRIGGER AS $$
    BEGIN
      -- business_reviews 테이블의 helpful_count 업데이트
      UPDATE business_reviews 
      SET helpful_count = (
        SELECT COUNT(*) 
        FROM review_helpfulness 
        WHERE review_id = COALESCE(NEW.review_id, OLD.review_id) AND is_helpful = true
      )
      WHERE id = COALESCE(NEW.review_id, OLD.review_id);

      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;
  `);

  // 도움됨 카운트 트리거 생성
  await knex.raw(`
    DROP TRIGGER IF EXISTS trigger_update_review_helpful_count ON review_helpfulness;
    CREATE TRIGGER trigger_update_review_helpful_count
      AFTER INSERT OR UPDATE OR DELETE ON review_helpfulness
      FOR EACH ROW EXECUTE FUNCTION update_review_helpful_count();
  `);
}

export async function down(knex: Knex): Promise<void> {
  // 트리거 및 함수 삭제
  await knex.raw('DROP TRIGGER IF EXISTS trigger_update_review_helpful_count ON review_helpfulness');
  await knex.raw('DROP TRIGGER IF EXISTS trigger_update_business_review_stats ON business_reviews');
  await knex.raw('DROP FUNCTION IF EXISTS update_review_helpful_count()');
  await knex.raw('DROP FUNCTION IF EXISTS update_business_review_stats()');

  // 테이블 삭제 (역순)
  await knex.schema.dropTableIfExists('review_replies');
  await knex.schema.dropTableIfExists('business_review_stats');
  await knex.schema.dropTableIfExists('review_images');
  await knex.schema.dropTableIfExists('review_helpfulness');
  await knex.schema.dropTableIfExists('review_reports');

  // business_reviews 테이블에서 추가한 컬럼들 삭제
  await knex.schema.alterTable('business_reviews', (table) => {
    table.dropColumn('status');
    table.dropColumn('report_count');
    table.dropColumn('helpful_count');
    table.dropColumn('reviewed_by');
    table.dropColumn('reviewed_at');
    table.dropColumn('review_notes');
    table.dropColumn('visit_purpose');
    table.dropColumn('tags');
    table.dropColumn('is_photo_review');
    table.dropColumn('visit_count');
  });
}