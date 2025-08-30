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
export const signInBusiness = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (data?.user) {
    // Check if user has business account
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', data.user.id)
      .single()
    
    if (bizError || !business) {
      // User exists but no business account
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
      .single()
    
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