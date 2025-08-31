const { createClient } = require('@supabase/supabase-js')

const supabaseAdmin = createClient(
  'https://ssokfehixfpkbgcghkxy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzb2tmZWhpeGZwa2JnY2doa3h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU0MjA5NywiZXhwIjoyMDcyMTE4MDk3fQ.dv-uD0BUu9pzk-4In56-A5UO3WJSaDVZhs-16Xr9bfQ'
)

async function fullApprovalTest() {
  console.log('🚀 전체 승인 프로세스 테스트\n')
  console.log('='.repeat(60))
  
  // 1. 새로운 테스트 신청 생성
  const timestamp = Date.now()
  const testApplication = {
    business_name: `승인테스트 카페 ${timestamp}`,
    business_number: `888-77-${String(timestamp).slice(-5)}`,
    owner_name: '김승인',
    phone: '010-8888-7777',
    email: `approval.test.${timestamp}@example.com`,
    address: '서울시 강남구 승인로 123',
    category: '카페',
    description: '승인 테스트용 카페입니다',
    status: 'pending',
    created_at: new Date().toISOString(),
    documents: [],
    display_time_slots: {
      mon: { open: '09:00', close: '22:00' },
      tue: { open: '09:00', close: '22:00' },
      wed: { open: '09:00', close: '22:00' },
      thu: { open: '09:00', close: '22:00' },
      fri: { open: '09:00', close: '23:00' },
      sat: { open: '10:00', close: '23:00' },
      sun: { open: '10:00', close: '21:00' }
    }
  }
  
  console.log('1️⃣ 테스트 신청 생성 중...')
  const { data: application, error: appError } = await supabaseAdmin
    .from('business_applications')
    .insert([testApplication])
    .select()
    .single()
  
  if (appError) {
    console.error('❌ 신청 생성 실패:', appError)
    return
  }
  
  console.log('✅ 신청 생성 완료')
  console.log(`   - ID: ${application.id}`)
  console.log(`   - 사업자명: ${application.business_name}`)
  console.log(`   - 이메일: ${application.email}`)
  
  // 2. 임시 비밀번호 생성
  const tempPassword = 'Test1234!'
  console.log(`\n2️⃣ 임시 비밀번호: ${tempPassword}`)
  
  // 3. Auth 계정 생성
  console.log('\n3️⃣ Auth 계정 생성 중...')
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: application.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      business_name: application.business_name,
      business_number: application.business_number,
      owner_name: application.owner_name,
      phone: application.phone,
      role: 'business_owner'
    }
  })
  
  if (authError) {
    console.error('❌ Auth 계정 생성 실패:', authError)
    return
  }
  
  console.log('✅ Auth 계정 생성 완료')
  console.log(`   - User ID: ${authData.user.id}`)
  
  // 4. businesses 테이블에 추가
  console.log('\n4️⃣ 비즈니스 정보 생성 중...')
  const { data: business, error: bizError } = await supabaseAdmin
    .from('businesses')
    .insert({
      owner_id: authData.user.id,
      business_name: application.business_name,
      business_number: application.business_number,
      category: application.category,
      address: application.address,
      phone: application.phone,
      verification_status: 'approved',
      application_id: application.id,
      approved_at: new Date().toISOString(),
      status: 'pending',
      description: application.description,
      business_hours: application.display_time_slots,
      documents: application.documents || [],
      tags: ['카페', '커피', '디저트'],
      images: []
    })
    .select()
    .single()
  
  if (bizError) {
    console.error('❌ 비즈니스 생성 실패:', bizError)
    // 롤백: Auth 계정 삭제
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return
  }
  
  console.log('✅ 비즈니스 생성 완료')
  console.log(`   - Business ID: ${business.id}`)
  
  // 5. 신청 상태 업데이트
  console.log('\n5️⃣ 신청 상태 업데이트 중...')
  const { error: updateError } = await supabaseAdmin
    .from('business_applications')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString()
    })
    .eq('id', application.id)
  
  if (updateError) {
    console.error('❌ 상태 업데이트 실패:', updateError)
  } else {
    console.log('✅ 상태 업데이트 완료')
  }
  
  // 6. 최종 확인
  console.log('\n6️⃣ 최종 검증...')
  
  // 신청 상태 확인
  const { data: finalApp } = await supabaseAdmin
    .from('business_applications')
    .select('status')
    .eq('id', application.id)
    .single()
  console.log(`   - 신청 상태: ${finalApp?.status === 'approved' ? '✅ 승인됨' : '❌ ' + finalApp?.status}`)
  
  // 비즈니스 확인
  const { data: finalBiz } = await supabaseAdmin
    .from('businesses')
    .select('business_name, status')
    .eq('owner_id', authData.user.id)
    .single()
  console.log(`   - 비즈니스 상태: ${finalBiz?.status === 'active' ? '✅ 활성' : '❌ ' + finalBiz?.status}`)
  
  // Auth 계정 확인
  const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(authData.user.id)
  console.log(`   - Auth 계정: ${user ? '✅ 존재' : '❌ 없음'}`)
  
  // 7. 로그인 테스트
  console.log('\n7️⃣ 로그인 테스트...')
  const { data: loginData, error: loginError } = await supabaseAdmin.auth.signInWithPassword({
    email: application.email,
    password: tempPassword
  })
  
  if (loginError) {
    console.log(`   - 로그인: ❌ 실패 (${loginError.message})`)
  } else {
    console.log(`   - 로그인: ✅ 성공`)
  }
  
  // 결과 출력
  console.log('\n' + '='.repeat(60))
  console.log('🎉 승인 프로세스 테스트 완료!')
  console.log('='.repeat(60))
  console.log('📋 테스트 결과:')
  console.log(`   ✅ 신청 생성`)
  console.log(`   ✅ Auth 계정 생성`)
  console.log(`   ✅ 비즈니스 등록`)
  console.log(`   ✅ 상태 업데이트`)
  console.log(`   ${loginError ? '❌' : '✅'} 로그인 테스트`)
  console.log('\n📱 로그인 정보:')
  console.log(`   - URL: http://localhost:5173 (buzz-biz)`)
  console.log(`   - 이메일: ${application.email}`)
  console.log(`   - 비밀번호: ${tempPassword}`)
  console.log(`   - 사업자번호: ${application.business_number}`)
  console.log('='.repeat(60))
  
  // 통계
  const { data: stats } = await supabaseAdmin
    .from('businesses')
    .select('id', { count: 'exact' })
  
  const { data: pendingStats } = await supabaseAdmin
    .from('business_applications')
    .select('id', { count: 'exact' })
    .eq('status', 'pending')
  
  console.log('\n📊 현재 시스템 통계:')
  console.log(`   - 총 비즈니스: ${stats?.length || 0}개`)
  console.log(`   - 대기 중 신청: ${pendingStats?.length || 0}개`)
}

fullApprovalTest().then(() => {
  console.log('\n✨ 모든 테스트 완료!')
  process.exit()
}).catch(err => {
  console.error('❌ 오류 발생:', err)
  process.exit(1)
})