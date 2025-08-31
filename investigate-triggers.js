const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ssokfehixfpkbgcghkxy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzb2tmZWhpeGZwa2JnY2doa3h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU0MjA5NywiZXhwIjoyMDcyMTE4MDk3fQ.dv-uD0BUu9pzk-4In56-A5UO3WJSaDVZhs-16Xr9bfQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigateTriggers() {
  try {
    console.log('=== 트리거 및 스키마 충돌 조사 ===\n');
    
    // 1. 테이블 구조 차이점 확인
    console.log('1. 테이블 구조 불일치 확인:');
    
    // mileage_accounts 테이블 구조 확인
    try {
      const { data: mileageData, error: mileageError } = await supabase
        .from('mileage_accounts')
        .select('*')
        .limit(1);
      
      if (mileageError) {
        console.log(`❌ mileage_accounts: ${mileageError.message}`);
      } else if (mileageData.length > 0) {
        console.log(`✅ mileage_accounts: 데이터 존재 (첫 번째 레코드 키: ${Object.keys(mileageData[0]).join(', ')})`);
      } else {
        console.log('⚠️  mileage_accounts: 테이블은 존재하나 데이터 없음');
      }
    } catch (e) {
      console.log(`❌ mileage_accounts: ${e.message}`);
    }
    
    // 2. 스키마 불일치 문제 - users 테이블의 id 타입 확인
    console.log('\n2. users 테이블 스키마 확인:');
    try {
      const { data: sampleUser } = await supabase
        .from('users')
        .select('id, email, created_at')
        .limit(1)
        .single();
      
      if (sampleUser) {
        console.log(`   - 샘플 사용자 ID 타입: ${typeof sampleUser.id}`);
        console.log(`   - 샘플 사용자 ID: ${sampleUser.id}`);
        console.log(`   - 이메일: ${sampleUser.email}`);
      }
    } catch (e) {
      console.log(`❌ users 테이블 샘플 조회 실패: ${e.message}`);
    }
    
    // 3. 스키마 데이터 타입 문제 확인  
    console.log('\n3. 스키마 데이터 타입 불일치 확인:');
    
    // users.id가 auth.users.id와 같은 타입인지 확인
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const authSample = authUsers.users[0];
    
    if (authSample) {
      console.log(`   - auth.users 샘플 ID: ${authSample.id} (타입: ${typeof authSample.id})`);
      
      // public.users에서 같은 ID 찾기
      const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authSample.id)
        .single();
        
      if (publicUser) {
        console.log(`   - public.users에서 발견: ${publicUser.email}`);
      } else if (publicError) {
        console.log(`   - public.users에서 미발견: ${publicError.message}`);
        console.log(`   ⚠️  이것은 트리거가 작동하지 않거나 ID 타입 불일치를 의미합니다.`);
      }
    }
    
    // 4. 최신 auth.users 중에서 public.users에 없는 사용자 확인
    console.log('\n4. 동기화 누락 사용자 확인:');
    let missingUsers = 0;
    
    for (const authUser of authUsers.users.slice(0, 10)) { // 처음 10명만 확인
      const { data: publicUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', authUser.id)
        .single();
        
      if (!publicUser) {
        missingUsers++;
        console.log(`   - 누락된 사용자: ${authUser.email} (ID: ${authUser.id.slice(0, 8)}...)`);
        console.log(`     생성일: ${new Date(authUser.created_at).toLocaleString()}`);
      }
    }
    
    if (missingUsers === 0) {
      console.log('   ✅ 확인한 사용자들은 모두 동기화되어 있습니다.');
    } else {
      console.log(`   ❌ ${missingUsers}명의 사용자가 public.users에 누락되었습니다.`);
    }
    
    // 5. 트리거 상태 추적을 위한 테스트
    console.log('\n5. 트리거 작동 상태 테스트:');
    console.log('   최신 auth 사용자와 public 사용자의 생성 시간 비교:');
    
    const recentAuthUsers = authUsers.users
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 3);
      
    for (const authUser of recentAuthUsers) {
      const { data: publicUser } = await supabase
        .from('users')
        .select('created_at, updated_at')
        .eq('id', authUser.id)
        .single();
        
      if (publicUser) {
        console.log(`   - Auth: ${authUser.email} (${new Date(authUser.created_at).toLocaleString()})`);
        console.log(`     Public: 생성 ${new Date(publicUser.created_at).toLocaleString()}, 수정 ${new Date(publicUser.updated_at).toLocaleString()}`);
      } else {
        console.log(`   - Auth: ${authUser.email} (${new Date(authUser.created_at).toLocaleString()})`);
        console.log(`     Public: ❌ 데이터 없음`);
      }
    }
    
    // 6. 트리거로 인한 오류 시뮬레이션
    console.log('\n6. 사용자 생성 시 발생할 수 있는 오류 분석:');
    console.log('   다음과 같은 오류들이 발생할 수 있습니다:');
    console.log('   1. 존재하지 않는 테이블 참조');
    console.log('   2. 컬럼 타입 불일치');
    console.log('   3. 제약 조건 위반');
    console.log('   4. 트리거 함수 내 오류');
    console.log('   5. 권한 부족');
    
    // 7. referral_stats 테이블 확인 (트리거에서 참조하는 테이블)
    console.log('\n7. 트리거가 참조하는 테이블들 존재 확인:');
    const triggerTables = ['referral_stats', 'referral_history', 'mileage_accounts'];
    
    for (const table of triggerTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
          
        if (error && error.code === 'PGRST116') {
          console.log(`   ❌ ${table}: 테이블이 존재하지 않음 - 트리거 오류 원인!`);
        } else if (error) {
          console.log(`   ⚠️  ${table}: ${error.message}`);
        } else {
          console.log(`   ✅ ${table}: ${count}개 레코드`);
        }
      } catch (e) {
        console.log(`   ❌ ${table}: ${e.message}`);
      }
    }
    
    console.log('\n=== 조사 완료 ===');
    
  } catch (error) {
    console.error('조사 과정에서 오류:', error);
  }
}

investigateTriggers();