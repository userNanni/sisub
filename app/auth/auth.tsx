import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import supabase from "@/utils/supabase";
import { type User, type Session, AuthError } from "@supabase/supabase-js";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Handle authentication state changes
  const handleAuthChange = useCallback(async (session: Session | null) => {
    setSession(session);
    const currentUser = session?.user ?? null;
    setUser(currentUser);
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting initial session:", error);
          return;
        }

        if (mounted) {
          await handleAuthChange(session);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Auth state changed: ${event}`);

      if (mounted) {
        await handleAuthChange(session);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleAuthChange]);

  // Sign in with enhanced error handling
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        throw new Error(getAuthErrorMessage(error));
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up with enhanced error handling
  const signUp = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw new Error(getAuthErrorMessage(error));
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out with cleanup
  const signOut = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Clear cookies and local storage first
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
      });

      // Clear localStorage
      localStorage.clear();
      sessionStorage.clear();

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Sign out error:", error);
        // Even if there's an error, clear local state
      }

      // Clear local state
      setUser(null);
      setSession(null);

      // Force reload to ensure clean state
      window.location.href = "/login";
    } catch (error) {
      console.error("Sign out error:", error);
      // Clear local state even on error
      setUser(null);
      setSession(null);
      window.location.href = "/login";
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      }
    );

    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  // Refresh session
  const refreshSession = async (): Promise<void> => {
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  // Delete account - simplified without profile table
  const deleteAccount = async (): Promise<void> => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      // Delete auth user (requires RLS policy or admin privileges)
      const { error: authError } = await supabase.auth.admin.deleteUser(
        user.id
      );

      if (authError) {
        throw new Error(`Failed to delete account: ${authError.message}`);
      }

      // Clear local state
      setUser(null);
      setSession(null);
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshSession,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Helper function for better error messages
const getAuthErrorMessage = (error: AuthError): string => {
  switch (error.message) {
    case "Invalid login credentials":
      return "Email ou senha incorretos";
    case "Email not confirmed":
      return "Por favor, confirme seu email antes de fazer login";
    case "User already registered":
      return "Este email já está cadastrado";
    case "Password should be at least 6 characters":
      return "A senha deve ter pelo menos 6 caracteres";
    case "Unable to validate email address: invalid format":
      return "Formato de email inválido";
    case "Signup is disabled":
      return "Cadastro temporariamente desabilitado";
    default:
      return error.message;
  }
};

// Custom hook with additional utilities
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Additional utility hooks
export const useRequireAuth = (redirectTo = "/login") => {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = redirectTo;
    }
  }, [isAuthenticated, isLoading, redirectTo]);

  return { isAuthenticated, isLoading };
};

// Simplified role hook - can be extended later if needed
export const useUserInfo = () => {
  const { user, isLoading } = useAuth();

  // You can extract role from user metadata if stored there
  const userRole = user?.user_metadata?.role || "user";

  return { 
    user, 
    userRole: userRole as "admin" | "user", 
    isLoading,
    email: user?.email,
    id: user?.id
  };
};