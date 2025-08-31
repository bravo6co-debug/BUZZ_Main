const { createClient } = require('@supabase/supabase-js')

// Service Role Key로 Admin 클라이언트 생성
const supabaseAdmin = createClient(
  'https://ssokfehixfpkbgcghkxy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzb2tmZWhpeGZwa2JnY2doa3h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU0MjA5NywiZXhwIjoyMDcyMTE4MDk3fQ.dv-uD0BUu9pzk-4In56-A5UO3WJSaDVZhs-16Xr9bfQ'
)

async function fixQRSystem() {
  console.log('🔧 QR 코드 및 쿠폰 시스템 직접 수정 시작...\n')
  
  try {
    // 1. 쿠폰 템플릿 생성 또는 확인
    console.log('1️⃣ 쿠폰 템플릿 생성...')
    
    let templateId
    
    // 기존 템플릿 확인
    const { data: existingTemplates, error: templateCheckError } = await supabaseAdmin
      .from('coupon_templates')
      .select('*')
      .eq('code', 'WELCOME2024')
      .single()
    
    if (!existingTemplates) {
      // 새 템플릿 생성
      const { data: newTemplate, error: templateError } = await supabaseAdmin
        .from('coupon_templates')
        .insert({
          code: 'WELCOME2024',
          name: '신규가입 환영 쿠폰',
          description: '첫 구매 시 20% 할인 (최대 5,000원)',
          discount_type: 'percentage',
          discount_value: 20,
          min_purchase_amount: 10000,
          max_discount_amount: 5000,
          valid_days: 30,
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (templateError) {
        console.error('템플릿 생성 실패:', templateError)
        return
      }
      
      templateId = newTemplate.id
      console.log('  ✅ 새 템플릿 생성 완료:', templateId)
    } else {
      templateId = existingTemplates.id
      console.log('  ✅ 기존 템플릿 사용:', templateId)
    }
    
    // 2. 모든 사용자 조회
    console.log('\n2️⃣ 사용자 조회 중...')
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email')
    
    if (usersError) {
      console.error('사용자 조회 실패:', usersError)
      return
    }
    
    console.log(`  - 총 ${users.length}명의 사용자 발견`)
    
    // 3. 각 사용자에게 쿠폰과 QR 코드 발급
    console.log('\n3️⃣ 쿠폰 및 QR 코드 발급 중...')
    
    let successCount = 0
    let errorCount = 0
    
    for (const user of users) {
      try {
        // 이미 쿠폰이 있는지 확인
        const { data: existingCoupons } = await supabaseAdmin
          .from('user_coupons')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
        
        if (existingCoupons && existingCoupons.length > 0) {
          console.log(`  ⏭️  ${user.email} - 이미 쿠폰 보유`)
          continue
        }
        
        // 쿠폰 ID 생성
        const couponId = crypto.randomUUID()
        const uniqueCode = 'WEL' + Math.random().toString(36).substring(2, 10).toUpperCase()
        
        // 쿠폰 생성
        const { error: couponError } = await supabaseAdmin
          .from('user_coupons')
          .insert({
            id: couponId,
            user_id: user.id,
            template_id: templateId,
            unique_code: uniqueCode,
            status: 'active',
            issued_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString()
          })
        
        if (couponError) {
          console.error(`  ❌ ${user.email} - 쿠폰 생성 실패:`, couponError.message)
          errorCount++
          continue
        }
        
        // QR 코드 생성
        const qrCodeId = crypto.randomUUID()
        const qrCode = 'QR' + Math.random().toString(36).substring(2, 12).toUpperCase()
        
        const { error: qrError } = await supabaseAdmin
          .from('qr_codes')
          .insert({
            id: qrCodeId,
            code: qrCode,
            type: 'coupon',
            data: {
              coupon_id: couponId,
              template_id: templateId,
              discount_type: 'percentage',
              discount_value: 20
            },
            user_id: user.id,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString()
          })
        
        if (qrError) {
          console.error(`  ❌ ${user.email} - QR 생성 실패:`, qrError.message)
          // 쿠폰도 삭제
          await supabaseAdmin.from('user_coupons').delete().eq('id', couponId)
          errorCount++
          continue
        }
        
        // 쿠폰과 QR 코드 연결
        const { error: updateError } = await supabaseAdmin
          .from('user_coupons')
          .update({ qr_code_id: qrCodeId })
          .eq('id', couponId)
        
        if (updateError) {
          console.error(`  ⚠️  ${user.email} - QR 연결 실패:`, updateError.message)
        }
        
        console.log(`  ✅ ${user.email} - 쿠폰 및 QR 발급 완료`)
        successCount++
        
      } catch (error) {
        console.error(`  ❌ ${user.email} - 오류:`, error.message)
        errorCount++
      }
    }
    
    console.log(`\n📊 발급 결과:`)
    console.log(`  - 성공: ${successCount}명`)
    console.log(`  - 실패: ${errorCount}명`)
    
    // 4. 최종 검증
    console.log('\n4️⃣ 최종 데이터 검증...')
    
    const tables = [
      'users',
      'user_profiles',
      'mileage_accounts',
      'coupon_templates',
      'user_coupons',
      'qr_codes'
    ]
    
    console.log('\n📊 테이블별 데이터 개수:')
    for (const table of tables) {
      const { count, error } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (!error) {
        console.log(`  - ${table}: ${count || 0}개`)
      } else {
        console.log(`  - ${table}: 조회 실패`)
      }
    }
    
    // 5. 샘플 데이터 출력
    console.log('\n📝 샘플 쿠폰 데이터:')
    const { data: sampleCoupons } = await supabaseAdmin
      .from('user_coupons')
      .select(`
        id,
        unique_code,
        status,
        user:users(email),
        template:coupon_templates(name)
      `)
      .limit(3)
    
    if (sampleCoupons && sampleCoupons.length > 0) {
      sampleCoupons.forEach(coupon => {
        console.log(`  - ${coupon.user?.email}: ${coupon.unique_code} (${coupon.status})`)
      })
    }
    
    console.log('\n✅ QR 코드 및 쿠폰 시스템 수정 완료!')
    
  } catch (error) {
    console.error('❌ 전체 오류:', error)
  }
}

// 실행
fixQRSystem().catch(console.error)