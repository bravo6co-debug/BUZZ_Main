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
      'x-app-version': import.meta.env.VITE_APP_VERSION || '1.0.0'
    }
  }
})

// Helper functions for common operations
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}

export const signUp = async (email: string, password: string, metadata?: any) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
  return { data, error }
}

export const signInWithKakao = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
  return { data, error }
}

// Test connection function
export const testConnection = async () => {
  try {
    console.log('Testing Supabase connection...')
    
    // Test 1: Check if we can reach Supabase
    const { data: healthCheck, error: healthError } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (healthError && healthError.code !== 'PGRST116') {
      // PGRST116 is "table does not exist" which is okay for now
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