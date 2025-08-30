import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication status
  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setIsLoggedIn(true);
        setUser(session.user);
      } else {
        // Fallback to localStorage for demo purposes
        const loggedIn = localStorage.getItem('buzz_logged_in') === 'true';
        setIsLoggedIn(loggedIn);
        
        if (loggedIn) {
          // Create mock user for demo
          setUser({
            id: 'demo-user',
            email: 'user@example.com',
            created_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: { name: '테스트 사용자' },
            aud: 'authenticated',
            role: 'authenticated'
          } as User);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    try {
      // Try Supabase auth first
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Fallback to demo login
        if (email === 'test@test.com' && password === 'test123') {
          localStorage.setItem('buzz_logged_in', 'true');
          setIsLoggedIn(true);
          setUser({
            id: 'demo-user',
            email: email,
            created_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: { name: '테스트 사용자' },
            aud: 'authenticated',
            role: 'authenticated'
          } as User);
          return { success: true };
        }
        return { success: false, error: error.message };
      }

      if (data.session) {
        setIsLoggedIn(true);
        setUser(data.user);
        localStorage.setItem('buzz_logged_in', 'true');
        return { success: true };
      }

      return { success: false, error: '로그인에 실패했습니다' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('buzz_logged_in');
      setIsLoggedIn(false);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if Supabase fails
      localStorage.removeItem('buzz_logged_in');
      setIsLoggedIn(false);
      setUser(null);
    }
  };

  // Initial auth check
  useEffect(() => {
    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      setIsLoggedIn(!!session);
      setUser(session?.user || null);
      
      if (session) {
        localStorage.setItem('buzz_logged_in', 'true');
      } else {
        localStorage.removeItem('buzz_logged_in');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{
      isLoggedIn,
      user,
      loading,
      login,
      logout,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}