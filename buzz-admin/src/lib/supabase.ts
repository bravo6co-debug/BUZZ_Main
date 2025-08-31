import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Regular client for general operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  },
  global: {
    headers: {
      'x-app-version': import.meta.env.VITE_ADMIN_VERSION || '1.0.0',
      'x-app-type': 'admin'
    }
  }
})

// Admin-specific auth functions
export const signInAdmin = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (data?.user) {
    // Check if user has admin role
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', data.user.id)
      .single()
    
    if (adminError || !adminUser) {
      await supabase.auth.signOut()
      return { data: null, error: { message: 'Unauthorized: Admin access only' } }
    }
    
    return { data: { ...data, adminUser }, error: null }
  }
  
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentAdmin = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (user) {
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    return { user, adminUser, error: adminError }
  }
  
  return { user: null, adminUser: null, error }
}

// Test connection function
export const testConnection = async () => {
  try {
    console.log('Testing Supabase connection for Admin...')
    
    // Test 1: Check if we can reach Supabase
    const { data: healthCheck, error: healthError } = await supabase
      .from('admin_users')
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