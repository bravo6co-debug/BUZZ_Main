# Edge Function 배포 가이드 (Supabase Dashboard)

## 1. Supabase Dashboard에서 Edge Function 배포하기

### Step 1: Supabase Dashboard 접속
1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인
2. 프로젝트 선택 (ssokfehixfpkbgcghkxy)

### Step 2: Edge Functions 섹션으로 이동
1. 왼쪽 사이드바에서 **Edge Functions** 클릭
2. **New Function** 버튼 클릭

### Step 3: 함수 생성 및 배포

#### reset-password 함수 배포
1. Function name: `reset-password`
2. 아래 코드를 복사하여 붙여넣기:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { businessNumber } = await req.json()

    if (!businessNumber) {
      return new Response(
        JSON.stringify({ error: '사업자 등록번호를 입력해주세요.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Service Role Key 사용 (환경 변수에서 자동으로 제공됨)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 승인된 비즈니스 찾기
    const cleanBusinessNumber = businessNumber.replace(/-/g, '')
    
    const { data: application, error: appError } = await supabaseAdmin
      .from('business_applications')
      .select('*')
      .eq('business_number', cleanBusinessNumber)
      .eq('status', 'approved')
      .single()

    if (appError || !application) {
      return new Response(
        JSON.stringify({ error: '승인된 사업자를 찾을 수 없습니다.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // 이메일로 재설정 링크 발송
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
      application.email,
      {
        redirectTo: `${req.headers.get('origin')}/reset-password`,
      }
    )

    if (resetError) {
      console.error('Password reset error:', resetError)
      return new Response(
        JSON.stringify({ error: '비밀번호 재설정 링크 발송에 실패했습니다.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${application.email}로 비밀번호 재설정 링크를 발송했습니다.` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: '서버 오류가 발생했습니다.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
```

3. **Deploy** 버튼 클릭

#### approve-business 함수 배포
1. Function name: `approve-business`
2. 아래 코드를 복사하여 붙여넣기:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { applicationId } = await req.json()

    if (!applicationId) {
      return new Response(
        JSON.stringify({ error: '신청 ID가 필요합니다.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 신청 정보 조회
    const { data: application, error: fetchError } = await supabaseAdmin
      .from('business_applications')
      .select('*')
      .eq('id', applicationId)
      .single()

    if (fetchError || !application) {
      return new Response(
        JSON.stringify({ error: '신청 정보를 찾을 수 없습니다.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // 임시 비밀번호 생성
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!'

    // Auth 사용자 생성
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: application.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        business_name: application.business_name,
        business_number: application.business_number,
        owner_name: application.owner_name,
        phone: application.phone
      }
    })

    if (authError) {
      console.error('Auth user creation error:', authError)
      return new Response(
        JSON.stringify({ error: '사용자 생성 실패: ' + authError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // businesses 테이블에 추가
    const { error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({
        id: authData.user.id,
        business_name: application.business_name,
        business_number: application.business_number,
        owner_name: application.owner_name,
        phone: application.phone,
        address: application.address,
        created_at: new Date().toISOString()
      })

    if (businessError) {
      // 실패 시 Auth 사용자 삭제 (롤백)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      console.error('Business creation error:', businessError)
      return new Response(
        JSON.stringify({ error: '비즈니스 정보 생성 실패' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 신청 상태 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('business_applications')
      .update({ 
        status: 'approved',
        approved_at: new Date().toISOString(),
        temp_password: tempPassword
      })
      .eq('id', applicationId)

    if (updateError) {
      console.error('Application update error:', updateError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: '승인이 완료되었습니다.',
        tempPassword 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Server error:', error)
    return new Response(
      JSON.stringify({ error: '서버 오류가 발생했습니다.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
```

3. **Deploy** 버튼 클릭

### Step 4: 배포 확인
1. Edge Functions 목록에서 함수 상태 확인
2. **Active** 상태인지 확인
3. 함수 URL 복사 (형식: `https://ssokfehixfpkbgcghkxy.supabase.co/functions/v1/function-name`)

### Step 5: 환경 변수 설정 (자동)
- Supabase는 자동으로 다음 환경 변수를 제공합니다:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

## 2. 로컬 개발 환경과 프로덕션 환경 전환

### Frontend 코드 수정 (buzz-biz)
```typescript
// src/lib/supabase.ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Edge Function 호출 시 - 자동으로 올바른 URL 사용
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { /* parameters */ }
})
```

## 3. 트러블슈팅

### CORS 에러
- Edge Function 코드에 CORS 헤더가 포함되어 있는지 확인
- OPTIONS 메서드 처리가 있는지 확인

### 권한 에러
- Service Role Key가 환경 변수로 제공되는지 확인
- RLS 정책이 Service Role을 차단하지 않는지 확인

### 함수가 작동하지 않을 때
1. Supabase Dashboard > Edge Functions > Logs 확인
2. 에러 메시지 확인
3. 함수 재배포 시도

## 4. 테스트
1. 브라우저 개발자 도구 > Network 탭 열기
2. 함수 호출 테스트
3. Response 확인

## 5. 유지보수
- 정기적으로 Edge Functions 로그 확인
- 에러 발생 시 즉시 대응
- 필요시 함수 업데이트 및 재배포