const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

// Service Role Key로 Admin 클라이언트 생성
const supabaseAdmin = createClient(
  'https://ssokfehixfpkbgcghkxy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzb2tmZWhpeGZwa2JnY2doa3h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU0MjA5NywiZXhwIjoyMDcyMTE4MDk3fQ.dv-uD0BUu9pzk-4In56-A5UO3WJSaDVZhs-16Xr9bfQ'
)

// QR 코드 데이터 생성 함수
function generateQRCodeData(userId, couponId) {
  const timestamp = Date.now()
  const random = crypto.randomBytes(4).toString('hex')
  return `QR_${userId}_${couponId}_${timestamp}_${random}`.toUpperCase()
}

async function issueCouponsToExistingUsers() {
  console.log('🎫 기존 사용자들에게 쿠폰 발급 시작...\n')
  
  try {
    // 1. 신규가입 쿠폰 찾기
    console.log('1️⃣ 신규가입 쿠폰 확인 중...')
    const { data: signupCoupon, error: couponError } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('type', 'signup')
      .eq('status', 'active')
      .single()
    
    if (couponError || !signupCoupon) {
      console.error('❌ 신규가입 쿠폰을 찾을 수 없습니다:', couponError)
      return
    }
    
    console.log(`✅ 신규가입 쿠폰 발견: ${signupCoupon.name}`)
    console.log(`   - ID: ${signupCoupon.id}`)
    console.log(`   - 할인: ${signupCoupon.discount_type === 'fixed' ? signupCoupon.discount_value + '원' : signupCoupon.discount_value + '%'}`)
    console.log(`   - 유효기간: ${signupCoupon.valid_until}`)
    
    // 2. 모든 사용자 조회
    console.log('\n2️⃣ 사용자 목록 조회 중...')
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, created_at')
      .order('created_at', { ascending: false })
    
    if (usersError) {
      console.error('❌ 사용자 조회 실패:', usersError)
      return
    }
    
    console.log(`✅ 총 ${users.length}명의 사용자 발견\n`)
    
    // 3. 각 사용자에게 쿠폰 발급
    console.log('3️⃣ 쿠폰 발급 시작...')
    let successCount = 0
    let skipCount = 0
    let errorCount = 0
    
    for (const user of users) {
      try {
        // 이미 쿠폰이 있는지 확인
        const { data: existingCoupons, error: checkError } = await supabaseAdmin
          .from('user_coupons')
          .select('id')
          .eq('user_id', user.id)
          .eq('coupon_id', signupCoupon.id)
          .limit(1)
        
        if (checkError) {
          console.error(`❌ ${user.email} - 확인 실패:`, checkError.message)
          errorCount++
          continue
        }
        
        if (existingCoupons && existingCoupons.length > 0) {
          console.log(`⏭️  ${user.email} - 이미 쿠폰 보유`)
          skipCount++
          continue
        }
        
        // QR 코드 데이터 생성
        const qrCodeData = generateQRCodeData(user.id, signupCoupon.id)
        
        // 쿠폰 발급
        const { error: insertError } = await supabaseAdmin
          .from('user_coupons')
          .insert({
            user_id: user.id,
            coupon_id: signupCoupon.id,
            issued_at: new Date().toISOString(),
            expires_at: signupCoupon.valid_until,
            status: 'active',
            qr_code_data: qrCodeData
          })
        
        if (insertError) {
          console.error(`❌ ${user.email} - 발급 실패:`, insertError.message)
          errorCount++
          continue
        }
        
        console.log(`✅ ${user.email} - 쿠폰 발급 완료 (QR: ${qrCodeData.substring(0, 20)}...)`)
        successCount++
        
        // 쿠폰 사용 수량 업데이트
        await supabaseAdmin
          .from('coupons')
          .update({ 
            used_quantity: signupCoupon.used_quantity + 1 
          })
          .eq('id', signupCoupon.id)
        
      } catch (error) {
        console.error(`❌ ${user.email} - 예외 발생:`, error.message)
        errorCount++
      }
    }
    
    // 4. 결과 요약
    console.log('\n' + '='.repeat(60))
    console.log('📊 쿠폰 발급 결과')
    console.log('='.repeat(60))
    console.log(`✅ 성공: ${successCount}명`)
    console.log(`⏭️  건너뜀: ${skipCount}명`)
    console.log(`❌ 실패: ${errorCount}명`)
    console.log('='.repeat(60))
    
    // 5. 최종 데이터 검증
    console.log('\n4️⃣ 최종 데이터 검증...')
    
    const { count: totalUserCoupons } = await supabaseAdmin
      .from('user_coupons')
      .select('*', { count: 'exact', head: true })
    
    const { count: activeUserCoupons } = await supabaseAdmin
      .from('user_coupons')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
    
    console.log(`\n📊 user_coupons 테이블 상태:`)
    console.log(`  - 총 쿠폰 수: ${totalUserCoupons}개`)
    console.log(`  - 활성 쿠폰 수: ${activeUserCoupons}개`)
    
    // 6. 샘플 데이터 출력
    console.log('\n📝 최근 발급된 쿠폰 샘플:')
    const { data: sampleCoupons } = await supabaseAdmin
      .from('user_coupons')
      .select(`
        id,
        qr_code_data,
        status,
        issued_at,
        expires_at,
        user:users(email),
        coupon:coupons(name, discount_type, discount_value)
      `)
      .order('issued_at', { ascending: false })
      .limit(5)
    
    if (sampleCoupons && sampleCoupons.length > 0) {
      sampleCoupons.forEach((uc, index) => {
        console.log(`\n  ${index + 1}. ${uc.user?.email}`)
        console.log(`     - 쿠폰: ${uc.coupon?.name}`)
        console.log(`     - QR: ${uc.qr_code_data?.substring(0, 30)}...`)
        console.log(`     - 상태: ${uc.status}`)
        console.log(`     - 만료일: ${new Date(uc.expires_at).toLocaleDateString()}`)
      })
    }
    
    console.log('\n✅ 쿠폰 발급 프로세스 완료!')
    
  } catch (error) {
    console.error('❌ 전체 오류:', error)
  }
}

// 실행
issueCouponsToExistingUsers().catch(console.error)