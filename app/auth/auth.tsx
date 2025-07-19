import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import supabase from '@/utils/supabase';
import { type User, type Session, AuthError } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userRole?: 'admin' | 'user';
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: { name?: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'user'>();

  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      setUserRole('user');
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole('user');
    }
  }, []);

  useEffect(() => {
    const handleAuthChange = async (session: Session | null) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchUserRole(currentUser.id);
      } else {
        setUserRole(undefined);
      }
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await handleAuthChange(session);
      setIsLoading(false);
    }).catch(error => {
      console.error("Error getting initial session:", error);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`Auth state changed: ${event}`);
        await handleAuthChange(session);
        if (isLoading) setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
}, [fetchUserRole, isLoading]);

  const signIn = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, metadata?: { name?: string }): Promise<void> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata || {} },
    });
    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    userRole,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};