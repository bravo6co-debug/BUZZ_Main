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

async function approveAllPending() {
  console.log('========================================');
  console.log('모든 대기 중인 비즈니스 승인 처리');
  console.log('========================================\n');
  
  const approvedList = [];
  const failedList = [];
  
  try {
    // 1. 모든 pending 신청 조회
    console.log('1. 대기 중인 신청 조회...');
    const { data: applications, error: fetchError } = await supabase
      .from('business_applications')
      .select('*')
      .eq('status', 'pending')
      .order('applied_at', { ascending: false });
    
    if (fetchError) {
      console.error('   ❌ 조회 실패:', fetchError);
      return;
    }
    
    console.log(`   ✅ ${applications.length}개의 대기 중인 신청 발견\n`);
    
    if (applications.length === 0) {
      console.log('승인할 신청이 없습니다.');
      return;
    }
    
    // 2. 각 신청에 대해 승인 처리
    for (let i = 0; i < applications.length; i++) {
      const application = applications[i];
      console.log(`\n[${i + 1}/${applications.length}] ${application.business_name} 처리 중...`);
      
      try {
        // 임시 비밀번호 생성
        const tempPassword = generateTempPassword();
        
        // auth.users에 계정 생성
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
            console.log('   ⚠️  이미 등록된 이메일, 기존 계정 사용');
            
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
        }
        
        // businesses 테이블에 매장 정보 생성
        const { data: existingBiz } = await supabase
          .from('businesses')
          .select('id')
          .eq('business_number', application.business_number)
          .single();
        
        if (!existingBiz) {
          const { error: bizError } = await supabase
            .from('businesses')
            .insert({
              owner_id: authData.user.id,
              business_name: application.business_name,
              business_number: application.business_number,
              category: application.category || '미지정',
              phone: application.phone,
              address: application.address || '',
              status: 'pending',
              verification_status: 'approved',
              display_time_slots: application.display_time_slots || null
            });
          
          if (bizError) {
            console.log('   ⚠️  매장 정보 생성 실패:', bizError.message);
          }
        }
        
        // business_applications 상태 업데이트
        const { error: updateError } = await supabase
          .from('business_applications')
          .update({
            status: 'approved',
            reviewed_at: new Date().toISOString()
          })
          .eq('id', application.id);
        
        if (updateError) {
          throw updateError;
        }
        
        console.log('   ✅ 승인 완료!');
        approvedList.push({
          business_name: application.business_name,
          business_number: application.business_number,
          email: application.email,
          password: tempPassword,
          phone: application.phone
        });
        
      } catch (error) {
        console.error(`   ❌ 승인 실패:`, error.message);
        failedList.push({
          business_name: application.business_name,
          business_number: application.business_number,
          error: error.message
        });
      }
    }
    
    // 3. 결과 출력
    console.log('\n========================================');
    console.log('승인 처리 완료!');
    console.log('========================================\n');
    
    console.log(`총 ${applications.length}개 신청 중:`);
    console.log(`✅ 성공: ${approvedList.length}개`);
    console.log(`❌ 실패: ${failedList.length}개\n`);
    
    if (approvedList.length > 0) {
      console.log('승인된 비즈니스 로그인 정보:');
      console.log('================================');
      approvedList.forEach((biz, index) => {
        console.log(`\n${index + 1}. ${biz.business_name}`);
        console.log(`   사업자번호: ${biz.business_number}`);
        console.log(`   비밀번호: ${biz.password}`);
        console.log(`   전화번호: ${biz.phone}`);
      });
      
      // CSV 형식으로도 저장
      const csvContent = [
        'business_name,business_number,email,password,phone',
        ...approvedList.map(b => `${b.business_name},${b.business_number},${b.email},${b.password},${b.phone}`)
      ].join('\n');
      
      const fs = require('fs');
      const filename = `approved-businesses-${Date.now()}.csv`;
      fs.writeFileSync(filename, csvContent, 'utf-8');
      console.log(`\n📁 로그인 정보가 ${filename} 파일에 저장되었습니다.`);
    }
    
    if (failedList.length > 0) {
      console.log('\n실패한 비즈니스:');
      console.log('================================');
      failedList.forEach((biz, index) => {
        console.log(`\n${index + 1}. ${biz.business_name}`);
        console.log(`   사업자번호: ${biz.business_number}`);
        console.log(`   오류: ${biz.error}`);
      });
    }
    
  } catch (error) {
    console.error('오류 발생:', error);
  }
}

// 실행
approveAllPending()
  .then(() => {
    console.log('\n프로세스 완료!');
    process.exit(0);
  })
  .catch(error => {
    console.error('오류:', error);
    process.exit(1);
  });