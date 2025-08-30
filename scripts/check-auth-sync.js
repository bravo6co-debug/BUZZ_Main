/**
 * Auth와 Public 테이블 동기화 상태 확인 스크립트
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAuthSync() {
  console.log('🔍 Auth와 Public 테이블 동기화 상태 확인\n');
  console.log('='.repeat(60));

  try {
    // 1. Auth 사용자 수 확인
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Auth 사용자 조회 실패:', authError);
      return;
    }

    console.log(`\n📊 Auth Users (auth.users): ${authUsers?.length || 0}명`);
    
    // 2. Public users 테이블 확인
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('*');
    
    if (publicError) {
      console.error('❌ Public users 조회 실패:', publicError);
    } else {
      console.log(`📊 Public Users (public.users): ${publicUsers?.length || 0}명`);
    }

    // 3. 동기화 상태 분석
    console.log('\n' + '='.repeat(60));
    console.log('📋 동기화 분석:\n');

    if (authUsers && publicUsers) {
      const authIds = new Set(authUsers.map(u => u.id));
      const publicIds = new Set(publicUsers.map(u => u.id));

      // Auth에만 있는 사용자
      const onlyInAuth = [...authIds].filter(id => !publicIds.has(id));
      if (onlyInAuth.length > 0) {
        console.log(`⚠️ Auth에만 있는 사용자: ${onlyInAuth.length}명`);
        authUsers
          .filter(u => onlyInAuth.includes(u.id))
          .forEach(u => {
            console.log(`   - ${u.email} (ID: ${u.id})`);
          });
      }

      // Public에만 있는 사용자
      const onlyInPublic = [...publicIds].filter(id => !authIds.has(id));
      if (onlyInPublic.length > 0) {
        console.log(`\n⚠️ Public에만 있는 사용자: ${onlyInPublic.length}명`);
        publicUsers
          .filter(u => onlyInPublic.includes(u.id))
          .forEach(u => {
            console.log(`   - ${u.email || u.name} (ID: ${u.id})`);
          });
      }

      // 동기화된 사용자
      const synced = [...authIds].filter(id => publicIds.has(id));
      console.log(`\n✅ 동기화된 사용자: ${synced.length}명`);

      if (onlyInAuth.length === 0 && onlyInPublic.length === 0) {
        console.log('\n🎉 완벽한 동기화 상태입니다!');
      } else {
        console.log('\n⚠️ 동기화가 필요합니다. setup-auth-trigger.sql을 실행하세요.');
      }
    }

    // 4. 최근 가입자 확인
    console.log('\n' + '='.repeat(60));
    console.log('📝 최근 Auth 사용자 (최근 5명):\n');

    authUsers
      ?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .forEach(user => {
        console.log(`📧 ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   생성: ${new Date(user.created_at).toLocaleString('ko-KR')}`);
        console.log(`   메타데이터:`, user.user_metadata);
        console.log('');
      });

    // 5. businesses 테이블과의 연동 확인
    console.log('='.repeat(60));
    console.log('🏢 Businesses 테이블 연동 상태:\n');

    const { data: businesses, error: bizError } = await supabase
      .from('businesses')
      .select('owner_id, business_name, business_number, verification_status')
      .order('created_at', { ascending: false })
      .limit(10);

    if (bizError) {
      console.error('❌ Businesses 조회 실패:', bizError);
    } else {
      console.log(`총 ${businesses?.length || 0}개 비즈니스\n`);
      
      businesses?.forEach(biz => {
        const authUser = authUsers?.find(u => u.id === biz.owner_id);
        console.log(`🏪 ${biz.business_name} (${biz.business_number})`);
        console.log(`   Owner ID: ${biz.owner_id}`);
        console.log(`   Auth 연동: ${authUser ? '✅ ' + authUser.email : '❌ 없음'}`);
        console.log(`   승인 상태: ${biz.verification_status}`);
        console.log('');
      });
    }

    // 6. 권장사항
    console.log('='.repeat(60));
    console.log('💡 권장사항:\n');
    console.log('1. Supabase Dashboard에서 setup-auth-trigger.sql 실행');
    console.log('2. 기존 사용자 동기화: node scripts/migrate-existing-businesses.js');
    console.log('3. 신규 가입 테스트: node scripts/create-test-application.js');
    console.log('4. 동기화 재확인: node scripts/check-auth-sync.js');

  } catch (error) {
    console.error('❌ 예기치 않은 오류:', error);
  }
}

checkAuthSync();