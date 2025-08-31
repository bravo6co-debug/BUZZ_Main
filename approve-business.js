const { createClient } = require('@supabase/supabase-js');

// Supabase 설정
const supabaseUrl = 'https://ssokfehixfpkbgcghkxy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzb2tmZWhpeGZwa2JnY2doa3h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU0MjA5NywiZXhwIjoyMDcyMTE4MDk3fQ.dv-uD0BUu9pzk-4In56-A5UO3WJSaDVZhs-16Xr9bfQ';

// Service Role 클라이언트
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 임시 비밀번호 생성 함수
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function approveBusiness(businessNumber) {
  console.log('========================================');
  console.log('비즈니스 가입 승인 처리');
  console.log('========================================\n');
  
  try {
    // 1. business_applications에서 pending 신청 조회
    console.log('1. 신청 정보 조회...');
    const { data: application, error: appError } = await supabase
      .from('business_applications')
      .select('*')
      .eq('business_number', businessNumber)
      .eq('status', 'pending')
      .single();
    
    if (appError || !application) {
      console.log('   ❌ 대기 중인 신청을 찾을 수 없습니다.');
      return;
    }
    
    console.log('   ✅ 신청 정보 발견:');
    console.log(`      - 상호명: ${application.business_name}`);
    console.log(`      - 대표자: ${application.owner_name}`);
    console.log(`      - 전화번호: ${application.phone}`);
    console.log(`      - 이메일: ${application.email}`);
    
    // 2. auth.users에 계정 생성
    console.log('\n2. auth.users에 계정 생성...');
    const tempPassword = generateTempPassword();
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: application.email,
      password: tempPassword,
      email_confirm: true, // 이메일 확인 자동 완료
      user_metadata: {
        business_name: application.business_name,
        business_number: application.business_number,
        owner_name: application.owner_name,
        phone: application.phone,
        role: 'business_owner'
      }
    });
    
    if (authError) {
      // 이미 계정이 있는 경우
      if (authError.message.includes('already been registered')) {
        console.log('   ⚠️  이미 등록된 이메일입니다. 기존 계정 사용.');
        
        // 기존 사용자 조회
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existingUser = users.find(u => u.email === application.email);
        
        if (existingUser) {
          authData.user = existingUser;
        } else {
          throw new Error('기존 사용자를 찾을 수 없습니다.');
        }
      } else {
        throw authError;
      }
    } else {
      console.log('   ✅ 계정 생성 성공!');
      console.log(`      - User ID: ${authData.user.id}`);
      console.log(`      - Email: ${authData.user.email}`);
      console.log(`      - 임시 비밀번호: ${tempPassword}`);
    }
    
    // 3. businesses 테이블에 매장 정보 생성
    console.log('\n3. businesses 테이블에 매장 정보 생성...');
    
    // 먼저 기존 데이터 확인
    const { data: existingBiz } = await supabase
      .from('businesses')
      .select('id')
      .eq('business_number', application.business_number)
      .single();
    
    if (!existingBiz) {
      const { data: bizData, error: bizError } = await supabase
        .from('businesses')
        .insert({
          owner_id: authData.user.id,
          business_name: application.business_name,
          business_number: application.business_number,
          category: application.category || '미지정',
          phone: application.phone,
          address: application.address || '',
          status: 'pending', // businesses 테이블은 pending으로 시작
          verification_status: 'approved',
          display_time_slots: application.display_time_slots || null
        })
        .select()
        .single();
      
      if (bizError) {
        console.log('   ❌ 매장 정보 생성 실패:', bizError.message);
      } else {
        console.log('   ✅ 매장 정보 생성 성공!');
      }
    } else {
      console.log('   ⚠️  이미 등록된 매장입니다.');
    }
    
    // 4. business_applications 상태 업데이트
    console.log('\n4. 신청 상태 업데이트...');
    const { error: updateError } = await supabase
      .from('business_applications')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', application.id);
    
    if (updateError) {
      console.log('   ❌ 상태 업데이트 실패:', updateError.message);
    } else {
      console.log('   ✅ 승인 완료!');
    }
    
    // 5. 결과 출력
    console.log('\n========================================');
    console.log('✅ 승인 처리 완료!');
    console.log('========================================');
    console.log('\n로그인 정보:');
    console.log(`- 사업자번호: ${application.business_number}`);
    console.log(`- 비밀번호: ${tempPassword}`);
    console.log('\n또는');
    console.log(`- 이메일: ${application.email}`);
    console.log(`- 비밀번호: ${tempPassword}`);
    console.log('\n💡 SMS로 위 정보를 전송하세요.');
    
  } catch (error) {
    console.error('오류 발생:', error);
  }
}

// 모든 대기 중인 신청 목록 조회
async function listPendingApplications() {
  console.log('\n📋 대기 중인 가입 신청 목록:');
  console.log('================================');
  
  const { data: applications, error } = await supabase
    .from('business_applications')
    .select('*')
    .eq('status', 'pending')
    .order('applied_at', { ascending: false });
  
  if (error) {
    console.error('조회 실패:', error);
    return;
  }
  
  if (!applications || applications.length === 0) {
    console.log('대기 중인 신청이 없습니다.');
    return;
  }
  
  applications.forEach((app, index) => {
    console.log(`\n${index + 1}. ${app.business_name}`);
    console.log(`   사업자번호: ${app.business_number}`);
    console.log(`   대표자: ${app.owner_name}`);
    console.log(`   전화번호: ${app.phone}`);
    console.log(`   신청일: ${new Date(app.applied_at).toLocaleString('ko-KR')}`);
  });
  
  console.log('\n================================');
  console.log(`총 ${applications.length}건의 대기 중인 신청`);
}

// 명령줄 인자 처리
const args = process.argv.slice(2);
const command = args[0];
const businessNumber = args[1];

async function main() {
  if (command === 'list') {
    // 대기 중인 신청 목록 조회
    await listPendingApplications();
  } else if (command === 'approve' && businessNumber) {
    // 특정 사업자번호 승인
    await approveBusiness(businessNumber);
  } else {
    console.log('사용법:');
    console.log('  node approve-business.js list                    - 대기 중인 신청 목록 조회');
    console.log('  node approve-business.js approve [사업자번호]     - 특정 신청 승인');
    console.log('\n예시:');
    console.log('  node approve-business.js list');
    console.log('  node approve-business.js approve 123-45-67890');
  }
  
  process.exit(0);
}

main().catch(console.error);