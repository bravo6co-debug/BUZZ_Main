const { createClient } = require('@supabase/supabase-js')

const supabaseAdmin = createClient(
  'https://ssokfehixfpkbgcghkxy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzb2tmZWhpeGZwa2JnY2doa3h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU0MjA5NywiZXhwIjoyMDcyMTE4MDk3fQ.dv-uD0BUu9pzk-4In56-A5UO3WJSaDVZhs-16Xr9bfQ'
)

async function completeApproval() {
  console.log('🔧 테스트 승인 완료 중...\n')
  
  // 1. 방금 생성한 Auth 계정 찾기
  const testEmail = 'test.cafe.1756646113309@example.com'
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
  const authUser = users?.find(u => u.email === testEmail)
  
  if (!authUser) {
    console.error('❌ Auth 계정을 찾을 수 없습니다')
    return
  }
  
  console.log('✅ Auth 계정 찾음:', authUser.id)
  
  // 2. 신청 정보 찾기
  const { data: application } = await supabaseAdmin
    .from('business_applications')
    .select('*')
    .eq('email', testEmail)
    .single()
  
  if (!application) {
    console.error('❌ 신청 정보를 찾을 수 없습니다')
    return
  }
  
  console.log('✅ 신청 정보 찾음:', application.business_name)
  
  // 3. businesses 테이블에 추가 (owner_name 제외)
  console.log('🏢 비즈니스 정보 생성 중...')
  const { data: business, error: bizError } = await supabaseAdmin
    .from('businesses')
    .insert({
      owner_id: authUser.id,
      business_name: application.business_name,
      business_number: application.business_number,
      category: application.category || '카페',
      address: application.address,
      phone: application.phone,
      verification_status: 'approved',
      application_id: application.id,
      approved_at: new Date().toISOString(),
      status: 'active',
      description: application.description || '편안한 분위기의 카페입니다',
      business_hours: application.display_time_slots || {
        mon: { open: '09:00', close: '22:00' },
        tue: { open: '09:00', close: '22:00' },
        wed: { open: '09:00', close: '22:00' },
        thu: { open: '09:00', close: '22:00' },
        fri: { open: '09:00', close: '23:00' },
        sat: { open: '10:00', close: '23:00' },
        sun: { open: '10:00', close: '21:00' }
      },
      documents: application.documents || [],
      tags: ['카페', '커피', '디저트'],
      images: []
    })
    .select()
    .single()
  
  if (bizError) {
    if (bizError.code === '23505') {
      console.log('⚠️  이미 등록된 비즈니스입니다.')
    } else {
      console.error('❌ 비즈니스 생성 실패:', bizError)
      return
    }
  } else {
    console.log('✅ 비즈니스 생성 완료!')
  }
  
  // 4. 신청 상태 업데이트
  console.log('📝 신청 상태 업데이트 중...')
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
    console.log('✅ 상태 업데이트 완료!')
  }
  
  // 5. 임시 비밀번호 재설정
  const newPassword = 'Test1234!'
  const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
    authUser.id,
    { password: newPassword }
  )
  
  if (resetError) {
    console.error('❌ 비밀번호 재설정 실패:', resetError)
  } else {
    console.log('✅ 비밀번호 재설정 완료!')
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('🎉 승인 완료! buzz-biz에서 로그인 가능합니다')
  console.log('='.repeat(60))
  console.log(`📧 이메일: ${testEmail}`)
  console.log(`🔑 비밀번호: ${newPassword}`)
  console.log(`🏢 사업자명: ${application.business_name}`)
  console.log(`📱 사업자번호: ${application.business_number}`)
  console.log(`🌐 URL: http://localhost:5173`)
  console.log('='.repeat(60))
}

completeApproval().then(() => {
  console.log('\n✨ 완료!')
  process.exit()
}).catch(err => {
  console.error('오류:', err)
  process.exit(1)
})