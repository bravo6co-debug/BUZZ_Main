const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAuthAndBusiness() {
  console.log('🚀 Auth 계정과 비즈니스 생성 프로세스 시작...\n');
  
  try {
    // 1. 승인된 신청서 찾기
    const { data: applications, error: fetchError } = await supabase
      .from('business_applications')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (fetchError) {
      console.error('신청서 조회 실패:', fetchError);
      return;
    }
    
    if (!applications || applications.length === 0) {
      console.log('승인된 신청서가 없습니다.');
      return;
    }
    
    const application = applications[0];
    console.log(`신청서 발견: ${application.business_name} (${application.business_number})`);
    
    // 2. 임시 비밀번호 생성
    const tempPassword = Math.random().toString(36).slice(-8).toUpperCase();
    console.log(`임시 비밀번호: ${tempPassword}`);
    
    // 3. 새 이메일로 Auth 계정 생성 (기존 이메일과 충돌 방지)
    const uniqueEmail = `${application.business_number.replace(/-/g, '')}@buzz.biz`;
    console.log(`생성할 이메일: ${uniqueEmail}`);
    
    // 기존 사용자 삭제 (있는 경우)
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingUser = users?.find(u => u.email === uniqueEmail);
    
    if (existingUser) {
      console.log('기존 사용자 발견, 삭제 중...');
      await supabase.auth.admin.deleteUser(existingUser.id);
    }
    
    // 새 Auth 계정 생성
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: uniqueEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        business_name: application.business_name,
        business_number: application.business_number,
        owner_name: application.owner_name,
        phone: application.phone,
        role: 'business_owner'
      }
    });
    
    if (authError) {
      console.error('Auth 계정 생성 실패:', authError);
      return;
    }
    
    console.log(`✅ Auth 계정 생성 성공! User ID: ${authData.user.id}`);
    
    // 4. users 테이블에 레코드 생성 (Auth와 동기화)
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: uniqueEmail,
        name: application.owner_name || application.business_name,
        created_at: new Date().toISOString()
      });
    
    if (userError) {
      // 이미 존재하는 경우 무시
      if (!userError.message?.includes('duplicate')) {
        console.log('users 테이블 생성 경고:', userError.message);
      }
    }
    
    // 5. 기존 비즈니스 삭제 (있는 경우)
    await supabase
      .from('businesses')
      .delete()
      .eq('business_number', application.business_number);
    
    // 6. businesses 테이블에 새 레코드 생성
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .insert({
        owner_id: authData.user.id,
        business_name: application.business_name,
        business_number: application.business_number,
        category: application.category,
        address: application.address,
        phone: application.phone,
        description: application.description || '',
        verification_status: 'approved'
      })
      .select()
      .single();
    
    if (businessError) {
      console.error('비즈니스 생성 실패:', businessError);
      // Auth 계정 롤백
      await supabase.auth.admin.deleteUser(authData.user.id);
      return;
    }
    
    console.log(`✅ 비즈니스 생성 성공! Business ID: ${businessData.id}`);
    
    // 7. 결과 출력
    console.log('\n' + '='.repeat(60));
    console.log('🎉 마이그레이션 완료!');
    console.log('\n로그인 정보:');
    console.log(`  - 사업자번호: ${application.business_number}`);
    console.log(`  - 이메일: ${uniqueEmail}`);
    console.log(`  - 임시 비밀번호: ${tempPassword}`);
    console.log('\nbuzz-biz에서 위 정보로 로그인할 수 있습니다.');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('예기치 않은 오류:', error);
  }
}

createAuthAndBusiness();