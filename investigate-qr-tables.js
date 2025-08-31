const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigateQRTables() {
  console.log('🔍 Investigating QR-related tables in Supabase...\n');

  // QR 관련 테이블 이름들
  const qrRelatedTables = [
    'qr_codes',
    'coupons', 
    'discount_coupons',
    'qr_code_scans',
    'business_qr_codes',
    'user_coupons',
    'promotions',
    'offers'
  ];

  for (const tableName of qrRelatedTables) {
    console.log(`\n📊 Checking table: ${tableName}`);
    console.log('='.repeat(50));

    try {
      // 테이블 존재 확인 및 데이터 개수
      const { data: countData, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (countError) {
        if (countError.code === 'PGRST116') {
          console.log(`❌ Table '${tableName}' does not exist`);
        } else {
          console.log(`❌ Error accessing '${tableName}':`, countError.message);
        }
        continue;
      }

      const count = countData?.length || 0;
      console.log(`✅ Table '${tableName}' exists`);
      console.log(`📈 Record count: ${count}`);

      // 첫 몇 개 레코드 샘플 조회
      const { data: sampleData, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(3);

      if (sampleError) {
        console.log(`❌ Error fetching sample data:`, sampleError.message);
        continue;
      }

      if (sampleData && sampleData.length > 0) {
        console.log(`📋 Sample data (first ${Math.min(3, sampleData.length)} records):`);
        console.log(JSON.stringify(sampleData, null, 2));
        
        // 테이블 스키마 정보 (첫 번째 레코드의 키들로 추정)
        const columns = Object.keys(sampleData[0]);
        console.log(`🔧 Columns: ${columns.join(', ')}`);
      } else {
        console.log(`📭 Table is empty`);
        
        // 빈 테이블의 경우 스키마 정보를 얻기 위해 insert 시도 후 에러 메시지에서 컬럼 정보 추출
        const { error: schemaError } = await supabase
          .from(tableName)
          .insert({});
        
        if (schemaError && schemaError.message) {
          console.log(`🔧 Schema info from error: ${schemaError.message}`);
        }
      }

    } catch (error) {
      console.log(`❌ Unexpected error with '${tableName}':`, error.message);
    }
  }

  // 전체 테이블 목록 확인 (QR 관련 테이블이 누락되었을 수 있음)
  console.log('\n\n🗃️  Checking all tables for QR-related names...');
  console.log('='.repeat(50));
  
  try {
    // PostgreSQL의 information_schema를 사용해 모든 테이블 조회
    const { data: allTables, error: tablesError } = await supabase
      .rpc('get_all_tables');
    
    if (tablesError) {
      console.log('❌ Could not fetch all tables:', tablesError.message);
      
      // 대안: 알려진 스키마 테이블들 직접 확인
      console.log('\n🔍 Trying alternative approach - checking common table patterns...');
      const commonPatterns = [
        'businesses',
        'users', 
        'auth.users',
        'business_users',
        'user_businesses'
      ];
      
      for (const pattern of commonPatterns) {
        try {
          const { data, error } = await supabase
            .from(pattern)
            .select('*', { count: 'exact', head: true });
          
          if (!error) {
            console.log(`✅ Found table: ${pattern}`);
          }
        } catch (e) {
          // 무시
        }
      }
    }
  } catch (error) {
    console.log('❌ Error checking all tables:', error.message);
  }

  // 관련 기능 확인: business 테이블에서 QR 관련 컬럼 확인
  console.log('\n\n🏢 Checking business table for QR-related columns...');
  console.log('='.repeat(50));
  
  try {
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .limit(2);

    if (businessError) {
      console.log(`❌ Error accessing businesses table:`, businessError.message);
    } else if (businessData && businessData.length > 0) {
      console.log(`✅ Business table exists with ${businessData.length} sample records`);
      const columns = Object.keys(businessData[0]);
      console.log(`🔧 Business table columns: ${columns.join(', ')}`);
      
      // QR 관련 컬럼 찾기
      const qrColumns = columns.filter(col => 
        col.toLowerCase().includes('qr') || 
        col.toLowerCase().includes('coupon') ||
        col.toLowerCase().includes('discount')
      );
      
      if (qrColumns.length > 0) {
        console.log(`🎯 QR-related columns found: ${qrColumns.join(', ')}`);
      } else {
        console.log(`❓ No obvious QR-related columns found`);
      }
    }
  } catch (error) {
    console.log(`❌ Error checking business table:`, error.message);
  }

  // 사용자 테이블도 확인
  console.log('\n\n👥 Checking users table for QR-related columns...');
  console.log('='.repeat(50));
  
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(2);

    if (userError) {
      console.log(`❌ Error accessing users table:`, userError.message);
    } else if (userData && userData.length > 0) {
      console.log(`✅ Users table exists with sample records`);
      const columns = Object.keys(userData[0]);
      console.log(`🔧 Users table columns: ${columns.join(', ')}`);
      
      // QR 관련 컬럼 찾기
      const qrColumns = columns.filter(col => 
        col.toLowerCase().includes('qr') || 
        col.toLowerCase().includes('coupon') ||
        col.toLowerCase().includes('discount')
      );
      
      if (qrColumns.length > 0) {
        console.log(`🎯 QR-related columns found: ${qrColumns.join(', ')}`);
      } else {
        console.log(`❓ No obvious QR-related columns found`);
      }
    }
  } catch (error) {
    console.log(`❌ Error checking users table:`, error.message);
  }

  console.log('\n\n📋 Investigation completed!');
}

// RPC 함수 생성을 위한 SQL (이미 존재할 수 있음)
async function createGetAllTablesFunction() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE OR REPLACE FUNCTION get_all_tables()
      RETURNS TABLE(table_name text)
      LANGUAGE sql
      SECURITY DEFINER
      AS $$
        SELECT tablename::text as table_name
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
      $$;
    `
  });
  
  if (error) {
    console.log('Note: Could not create helper function (may not be needed)');
  }
}

// 메인 실행
investigateQRTables().catch(console.error);