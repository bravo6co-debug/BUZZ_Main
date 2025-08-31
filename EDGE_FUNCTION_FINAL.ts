// Edge Function: 매장 승인 처리 (최종 버전)
// Supabase Dashboard에 이 코드를 붙여넣으세요

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

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
    const { applicationId } = await req.json()
    console.log('Processing application:', applicationId)

    // Supabase Admin 클라이언트 생성
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 1. 신청서 조회
    const { data: application, error: fetchError } = await supabaseAdmin
      .from('business_applications')
      .select('*')
      .eq('id', applicationId)
      .single()

    if (fetchError || !application) {
      console.error('Application not found:', fetchError)
      throw new Error('신청서를 찾을 수 없습니다')
    }

    console.log('Application found:', application.business_name)

    // 2. 임시 비밀번호 생성
    const tempPassword = Math.random().toString(36).slice(-8).toUpperCase()
    console.log('Temp password generated')

    // 3. Supabase Auth에 사용자 생성
    let userId = null
    let authData = null
    
    try {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
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

      if (error) {
        console.error('Auth creation error:', error)
        
        // 이미 존재하는 이메일인 경우
        if (error.message?.includes('already')) {
          console.log('User already exists, finding existing user...')
          const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
          const existingUser = users?.find(u => u.email === application.email)
          
          if (existingUser) {
            userId = existingUser.id
            authData = { user: existingUser }
            console.log('Existing user found:', userId)
          } else {
            throw new Error('기존 사용자를 찾을 수 없습니다')
          }
        } else {
          throw error
        }
      } else {
        userId = data.user.id
        authData = data
        console.log('New user created:', userId)
      }
    } catch (authError) {
      console.error('Auth error:', authError)
      throw authError
    }

    // 4. business_applications 상태 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('business_applications')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', applicationId)

    if (updateError) {
      console.error('Application update error:', updateError)
      throw updateError
    }

    console.log('Application status updated')

    // 5. businesses 테이블에 비즈니스 생성
    const businessData = {
      owner_id: userId,
      business_name: application.business_name,
      business_number: application.business_number,
      category: application.category || '기타',
      address: application.address,
      phone: application.phone,
      verification_status: 'approved',
      application_id: applicationId,
      approved_at: new Date().toISOString(),
      status: 'active'  // 'active' 사용
    }

    // 선택적 필드 추가
    if (application.description) {
      businessData.description = application.description
    }
    if (application.display_time_slots) {
      businessData.display_time_slots = application.display_time_slots
      businessData.business_hours = application.display_time_slots
    }
    if (application.documents && application.documents.length > 0) {
      businessData.documents = application.documents
    }

    console.log('Creating business with data:', businessData)

    const { error: insertError } = await supabaseAdmin
      .from('businesses')
      .insert(businessData)

    if (insertError) {
      console.error('Business creation error:', insertError)
      console.error('Error details:', insertError.message)
      
      // 롤백: 새로 생성한 Auth 계정 삭제
      if (authData?.user?.id) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        console.log('Rolled back auth user creation')
      }
      throw new Error(`비즈니스 생성 실패: ${insertError.message}`)
    }

    console.log('Business created successfully')

    // 6. SMS 발송 (TODO)
    console.log(`SMS to be sent to ${application.phone}: ${tempPassword}`)

    // 성공 응답
    const response = {
      success: true,
      message: '매장 승인이 완료되었습니다',
      data: {
        businessName: application.business_name,
        tempPassword: tempPassword
      }
    }

    console.log('Returning success response')

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in approve-business function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || '알 수 없는 오류가 발생했습니다'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})