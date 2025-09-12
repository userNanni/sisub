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
import { useLocation, useNavigate } from "react-router-dom";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type NormalizedAuthError = {
  code:
    | "INVALID_CREDENTIALS"
    | "EMAIL_NOT_CONFIRMED"
    | "RATE_LIMITED"
    | "INVALID_EMAIL"
    | "WEAK_PASSWORD"
    | "SIGNUP_DISABLED"
    | "UNKNOWN";
  message: string;
};

const normalizeAuthError = (e: any): NormalizedAuthError => {
  const status = e?.status as number | undefined;
  const msg = (e?.message as string | undefined) || "Erro de autenticação";

  if (/invalid login credentials/i.test(msg)) {
    return {
      code: "INVALID_CREDENTIALS",
      message: "Email ou senha incorretos",
    };
  }
  if (/email not confirmed/i.test(msg)) {
    return {
      code: "EMAIL_NOT_CONFIRMED",
      message: "Por favor, confirme seu email antes de fazer login",
    };
  }
  if (/rate limit/i.test(msg) || status === 429) {
    return {
      code: "RATE_LIMITED",
      message: "Muitas tentativas. Aguarde um pouco e tente novamente.",
    };
  }
  if (/invalid format/i.test(msg)) {
    return { code: "INVALID_EMAIL", message: "Formato de email inválido" };
  }
  if (/at least 6 characters/i.test(msg)) {
    return {
      code: "WEAK_PASSWORD",
      message: "A senha deve ter pelo menos 6 caracteres",
    };
  }
  if (/signup is disabled/i.test(msg)) {
    return {
      code: "SIGNUP_DISABLED",
      message: "Cadastro temporariamente desabilitado",
    };
  }
  return { code: "UNKNOWN", message: msg };
};

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
        }
        if (mounted) {
          await handleAuthChange(session ?? null);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Alguns ambientes disparam 'INITIAL_SESSION' ao assinar
      // Outros disparam 'SIGNED_IN'/'TOKEN_REFRESHED' etc.
      if (!mounted) return;
      await handleAuthChange(session ?? null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleAuthChange]);

  // Sign in with enhanced error handling
  const signIn = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      console.debug("Supabase signIn error:", {
        name: (error as any)?.name,
        status: (error as any)?.status,
        message: error.message,
      });
      const normalized = normalizeAuthError(error);
      const err: any = new Error(normalized.message);
      err.code = normalized.code;
      err.status = (error as any)?.status;
      throw err;
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
        document.cookie =
          name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        document.cookie =
          name +
          "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" +
          window.location.hostname;
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
    } catch (error) {
      console.error("Sign out error:", error);
      // Clear local state even on error
      setUser(null);
      setSession(null);
    } finally {
      setUser(null);
      setSession(null);
      setIsLoading(false);
      window.location.href = "/login";
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
export const useRequireAuth = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const redirectTo = encodeURIComponent(
        `${location.pathname}${location.search}`
      );
      navigate(`/login?redirectTo=${redirectTo}`, { replace: true });
    }
  }, [
    isAuthenticated,
    isLoading,
    location.pathname,
    location.search,
    navigate,
  ]);

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
    id: user?.id,
  };
};

export type userLevelType = "user" | "admin" | "superadmin" | null;

/**
 * Verifica o nível de permissão de um usuário.
 * Se o usuário estiver na tabela 'profiles_admin' com a role 'admin' ou 'superadmin', retorna essa role.
 * Caso contrário, ou se não for encontrado, retorna 'user'.
 * Retorna 'null' se o userId não for fornecido ou em caso de erro na consulta.
 */
export async function checkUserLevel(
  userId: string | null | undefined
): Promise<userLevelType> {
  // 1. Se não houver userId, não podemos determinar o nível.
  if (!userId) {
    return null;
  }

  try {
    // 2. Faz a consulta ao Supabase para buscar a role do usuário.
    const { data, error } = await supabase
      .from("profiles_admin")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    // 3. Em caso de erro na consulta, exibe no console e retorna null.
    if (error) {
      console.error("Erro ao verificar o nível de admin:", error);
      return null;
    }

    // 4. Se a consulta não retornar dados, significa que o usuário não tem uma role
    // superior, então ele é um usuário comum.
    if (!data) {
      return null;
    }

    // 5. Se a role for 'admin' ou 'superadmin', retorna o nível correspondente.
    // Caso contrário, por segurança, trata como um usuário comum.
    if (
      data.role === "admin" ||
      data.role === "superadmin" ||
      data.role === "user"
    ) {
      return data.role;
    } else {
      return null;
    }
  } catch (e) {
    console.error("Erro inesperado ao verificar o nível do usuário:", e);
    return null; // Retorna null para qualquer erro não esperado.
  }
}

export type userOmType = string | null;

export async function checkUserOm(
  userId: string | null | undefined
): Promise<userOmType> {
  // 1. Se não houver userId, não podemos determinar o nível.
  if (!userId) {
    return null;
  }

  try {
    // 2. Faz a consulta ao Supabase para buscar a role do usuário.
    const { data, error } = await supabase
      .from("profiles_admin")
      .select("om")
      .eq("id", userId)
      .maybeSingle();

    // 3. Em caso de erro na consulta, exibe no console e retorna null.
    if (error) {
      console.error("Erro ao verificar o nível de admin:", error);
      return null;
    }

    // 4. Se a consulta não retornar dados, significa que o usuário não tem uma role
    // superior, então ele é um usuário comum.
    if (!data) {
      return null;
    }

    // 5. Se a role for 'admin' ou 'superadmin', retorna o nível correspondente.
    // Caso contrário, por segurança, trata como um usuário comum.

    return data.om;
  } catch (e) {
    console.error("Erro inesperado ao verificar o nível do usuário:", e);
    return null; // Retorna null para qualquer erro não esperado.
  }
}
