const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

// Service Role Key로 Admin 클라이언트 생성
const supabaseAdmin = createClient(
  'https://ssokfehixfpkbgcghkxy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzb2tmZWhpeGZwa2JnY2doa3h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU0MjA5NywiZXhwIjoyMDcyMTE4MDk3fQ.dv-uD0BUu9pzk-4In56-A5UO3WJSaDVZhs-16Xr9bfQ'
)

// 리퍼럴 코드 생성 함수
function generateReferralCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 6)
}

// 유니크한 리퍼럴 코드 생성 (중복 체크)
async function generateUniqueReferralCode(existingCodes = new Set()) {
  let attempts = 0
  let code
  
  do {
    code = generateReferralCode()
    attempts++
    
    // 10번 시도 후에는 타임스탬프 추가
    if (attempts > 10) {
      code = (Date.now().toString(36) + crypto.randomBytes(2).toString('hex')).toUpperCase().substring(0, 6)
    }
  } while (existingCodes.has(code) && attempts < 20)
  
  return code
}

async function generateProfiles() {
  console.log('🚀 사용자 프로필 생성 시작\n')
  console.log('=' .repeat(70))
  
  try {
    // 1. 현재 상황 파악
    console.log('1️⃣ 현재 상황 확인...')
    
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email, name, created_at')
      .order('created_at', { ascending: false })
    
    const { data: existingProfiles } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, referral_code')
    
    console.log(`   - 총 사용자: ${users.length}명`)
    console.log(`   - 기존 프로필: ${existingProfiles.length}개`)
    console.log(`   - 프로필 필요: ${users.length - existingProfiles.length}명`)
    
    // 기존 리퍼럴 코드 세트
    const existingCodes = new Set(existingProfiles.map(p => p.referral_code).filter(Boolean))
    const usersWithProfile = new Set(existingProfiles.map(p => p.user_id))
    
    // 2. 프로필이 없는 사용자 찾기
    const usersWithoutProfile = users.filter(u => !usersWithProfile.has(u.id))
    
    if (usersWithoutProfile.length === 0) {
      console.log('\n✅ 모든 사용자가 이미 프로필을 가지고 있습니다!')
      return
    }
    
    console.log(`\n2️⃣ ${usersWithoutProfile.length}명의 사용자에게 프로필 생성 중...`)
    
    let successCount = 0
    let failCount = 0
    
    for (const user of usersWithoutProfile) {
      try {
        // 유니크한 리퍼럴 코드 생성
        const referralCode = await generateUniqueReferralCode(existingCodes)
        existingCodes.add(referralCode)
        
        // 프로필 생성 (필수 필드 포함)
        const { data: profile, error } = await supabaseAdmin
          .from('user_profiles')
          .insert({
            user_id: user.id,
            referral_code: referralCode,
            terms_agreed_at: new Date().toISOString(),
            privacy_agreed_at: new Date().toISOString(),
            marketing_agree: false,
            created_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (error) {
          console.log(`   ❌ ${user.email} - 실패: ${error.message}`)
          failCount++
        } else {
          console.log(`   ✅ ${user.email} - 리퍼럴 코드: ${referralCode}`)
          successCount++
        }
        
      } catch (error) {
        console.log(`   ❌ ${user.email} - 오류: ${error.message}`)
        failCount++
      }
    }
    
    // 3. 결과 요약
    console.log('\n' + '=' .repeat(70))
    console.log('📊 프로필 생성 결과')
    console.log('=' .repeat(70))
    console.log(`✅ 성공: ${successCount}명`)
    console.log(`❌ 실패: ${failCount}명`)
    
    // 4. 최종 확인
    console.log('\n3️⃣ 최종 상태 확인...')
    
    const { count: finalUserCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
    
    const { count: finalProfileCount } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
    
    console.log(`   - 총 사용자: ${finalUserCount}명`)
    console.log(`   - 총 프로필: ${finalProfileCount}개`)
    
    if (finalUserCount === finalProfileCount) {
      console.log('\n🎉 모든 사용자가 프로필과 리퍼럴 코드를 가지게 되었습니다!')
    } else {
      console.log(`\n⚠️ 아직 ${finalUserCount - finalProfileCount}명의 사용자가 프로필이 없습니다.`)
    }
    
    // 5. 샘플 출력
    console.log('\n📝 최근 생성된 프로필 샘플:')
    const { data: sampleProfiles } = await supabaseAdmin
      .from('user_profiles')
      .select(`
        referral_code,
        created_at,
        user:users(email, name)
      `)
      .order('created_at', { ascending: false })
      .limit(5)
    
    sampleProfiles?.forEach((profile, index) => {
      console.log(`\n${index + 1}. ${profile.user?.email}`)
      console.log(`   - 리퍼럴 코드: ${profile.referral_code}`)
      console.log(`   - 리퍼럴 링크: http://localhost:3010/signup?ref=${profile.referral_code}`)
    })
    
  } catch (error) {
    console.error('❌ 오류:', error.message)
  }
  
  console.log('\n' + '=' .repeat(70))
  console.log('완료!')
  console.log('=' .repeat(70))
}

generateProfiles()