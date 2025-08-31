import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  },
  global: {
    headers: {
      'x-app-version': import.meta.env.VITE_BIZ_VERSION || '1.0.0',
      'x-app-type': 'business'
    }
  }
})

// Business-specific auth functions
export const signInBusiness = async (emailOrBusinessNumber: string, password: string) => {
  // 사업자번호인 경우 이메일 형식으로 변환
  let email = emailOrBusinessNumber;
  if (!emailOrBusinessNumber.includes('@')) {
    // 사업자번호인 경우, business_applications에서 이메일 찾기
    const cleanBusinessNumber = emailOrBusinessNumber.replace(/-/g, '');
    
    // business_applications 테이블에서 승인된 비즈니스의 이메일 찾기
    // 먼저 하이픈 포함된 형태로 시도
    let application = null;
    const { data: appWithHyphen } = await supabase
      .from('business_applications')
      .select('email')
      .eq('business_number', emailOrBusinessNumber)
      .eq('status', 'approved')
      .maybeSingle()
    
    if (appWithHyphen) {
      application = appWithHyphen;
    } else {
      // 하이픈 제거한 형태로 재시도
      const { data: appWithoutHyphen } = await supabase
        .from('business_applications')
        .select('email')
        .eq('business_number', cleanBusinessNumber)
        .eq('status', 'approved')
        .maybeSingle()
      
      application = appWithoutHyphen;
    }
    
    if (application?.email) {
      email = application.email;
    } else {
      // 이메일을 찾을 수 없으면 기본 형식 사용 (하위 호환성)
      email = `${cleanBusinessNumber}@buzz.biz`;
    }
  }
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (data?.user) {
    // Check if user has business account (여러 매장 중 첫 번째 선택)
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', data.user.id) // owner_id 사용
      .limit(1)
      .maybeSingle()
    
    if (bizError || !business) {
      // businesses 테이블에 없으면 business_applications에서 확인
      const { data: pendingApp } = await supabase
        .from('business_applications')
        .select('*')
        .eq('email', data.user.email)
        .maybeSingle()
      
      if (pendingApp) {
        // 승인 대기 중이거나 데이터 동기화 문제
        return { 
          data: { 
            ...data, 
            business: null,
            pendingApplication: pendingApp 
          }, 
          error: null 
        }
      }
      
      return { data: { ...data, business: null }, error: null }
    }
    
    return { data: { ...data, business }, error: null }
  }
  
  return { data, error }
}

export const registerBusiness = async (businessData: any) => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: { message: 'User not authenticated' } }
  }
  
  const { data, error } = await supabase
    .from('businesses')
    .insert({
      ...businessData,
      owner_id: user.id,
      status: 'pending'
    })
    .select()
    .single()
  
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentBusiness = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (user) {
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .limit(1)
      .maybeSingle()
    
    return { user, business, error: bizError }
  }
  
  return { user: null, business: null, error }
}

// QR Code related functions
export const generateQRCode = async (businessId: string, amount: number) => {
  const { data, error } = await supabase
    .from('qr_codes')
    .insert({
      business_id: businessId,
      amount,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes expiry
    })
    .select()
    .single()
  
  return { data, error }
}

export const validateQRCode = async (qrId: string) => {
  const { data, error } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('id', qrId)
    .single()
  
  if (data) {
    const isExpired = new Date(data.expires_at) < new Date()
    const isUsed = data.used_at !== null
    
    return {
      data,
      isValid: !isExpired && !isUsed,
      error: null
    }
  }
  
  return { data: null, isValid: false, error }
}

// Test connection function
export const testConnection = async () => {
  try {
    console.log('Testing Supabase connection for Biz...')
    
    // Test 1: Check if we can reach Supabase
    const { data: healthCheck, error: healthError } = await supabase
      .from('businesses')
      .select('count')
      .limit(1)
    
    if (healthError && healthError.code !== 'PGRST116') {
      console.error('Connection test failed:', healthError)
      return { success: false, error: healthError }
    }
    
    // Test 2: Check auth status
    const { data: { session } } = await supabase.auth.getSession()
    
    console.log('Supabase connection successful!')
    console.log('Session status:', session ? 'Active' : 'No active session')
    
    return {
      success: true,
      message: 'Supabase connection successful',
      hasSession: !!session
    }
  } catch (error) {
    console.error('Connection test error:', error)
    return { success: false, error }
  }
}

// Export type definitions
export type { User, Session } from '@supabase/supabase-js'