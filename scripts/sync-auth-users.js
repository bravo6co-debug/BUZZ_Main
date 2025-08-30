/**
 * Auth.users와 Public.users 테이블 수동 동기화 스크립트
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncAuthUsers() {
  console.log('🔄 Auth와 Public 테이블 동기화 시작\n');
  console.log('='.repeat(60));

  try {
    // 1. Auth 사용자 가져오기
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Auth 사용자 조회 실패:', authError);
      return;
    }

    console.log(`📊 Auth 사용자 수: ${authUsers?.length || 0}명\n`);

    // 2. 각 Auth 사용자를 Public users에 동기화
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const authUser of authUsers || []) {
      try {
        // 이미 존재하는지 확인
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', authUser.id)
          .single();

        if (existingUser) {
          console.log(`⏭️ 이미 존재: ${authUser.email}`);
          skipCount++;
          continue;
        }

        // Public users에 삽입
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email,
            name: authUser.user_metadata?.name || 
                  authUser.user_metadata?.business_name || 
                  authUser.user_metadata?.owner_name ||
                  authUser.email?.split('@')[0] || 
                  'Unknown',
            created_at: authUser.created_at,
            updated_at: authUser.updated_at || authUser.created_at
          });

        if (insertError) {
          console.error(`❌ 삽입 실패 (${authUser.email}):`, insertError.message);
          errorCount++;
        } else {
          console.log(`✅ 동기화 완료: ${authUser.email}`);
          successCount++;
        }
      } catch (error) {
        console.error(`❌ 처리 중 오류 (${authUser.email}):`, error.message);
        errorCount++;
      }
    }

    // 3. 결과 요약
    console.log('\n' + '='.repeat(60));
    console.log('📊 동기화 결과:\n');
    console.log(`✅ 성공: ${successCount}명`);
    console.log(`⏭️ 건너뜀: ${skipCount}명`);
    console.log(`❌ 실패: ${errorCount}명`);

    // 4. 최종 상태 확인
    const { data: publicUsers } = await supabase
      .from('users')
      .select('id');

    console.log(`\n📊 최종 Public users 수: ${publicUsers?.length || 0}명`);

    // 5. 반대 방향 정리 (Public에만 있는 사용자)
    console.log('\n' + '='.repeat(60));
    console.log('🧹 정리 작업:\n');

    const authIds = new Set(authUsers?.map(u => u.id) || []);
    const orphanedUsers = publicUsers?.filter(u => !authIds.has(u.id)) || [];

    if (orphanedUsers.length > 0) {
      console.log(`⚠️ Auth에 없는 Public 사용자 발견: ${orphanedUsers.length}명`);
      console.log('이들은 수동으로 검토가 필요합니다.');
      
      // 상세 정보 출력
      for (const orphan of orphanedUsers.slice(0, 5)) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', orphan.id)
          .single();
        
        if (userData) {
          console.log(`   - ${userData.email || userData.name} (ID: ${userData.id})`);
        }
      }
      
      if (orphanedUsers.length > 5) {
        console.log(`   ... 외 ${orphanedUsers.length - 5}명`);
      }
    } else {
      console.log('✅ 모든 Public 사용자가 Auth와 연결되어 있습니다.');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ 동기화 작업 완료!\n');
    console.log('💡 다음 단계:');
    console.log('1. Supabase Dashboard에서 setup-auth-trigger.sql 실행하여 자동 동기화 설정');
    console.log('2. node scripts/check-auth-sync.js로 상태 재확인');

  } catch (error) {
    console.error('❌ 예기치 않은 오류:', error);
  }
}

syncAuthUsers();