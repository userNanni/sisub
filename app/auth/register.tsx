import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./auth";
import { AuthError } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Mail,
  Lock,
  CheckCircle,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
  X,
} from "lucide-react";
import { cn } from "~/utils/utils";

import type { Route } from "./+types/register";

const FAB_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@fab\.mil\.br$/;

// Password strength validation
const getPasswordStrength = (password: string) => {
  let score = 0;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  score = Object.values(checks).filter(Boolean).length;

  return {
    score,
    checks,
    strength: score < 2 ? "weak" : score < 4 ? "medium" : "strong",
  };
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Registre-se - SISUB" },
    {
      name: "description",
      content: "Criar conta no SISUB",
    },
  ];
}

export default function Register() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [apiError, setApiError] = useState("");

  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const { signUp, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const from = location.state?.from?.pathname || "/rancho";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  // Real-time validation
  useEffect(() => {
    const newErrors = { ...fieldErrors };

    // Email validation
    if (formData.email && !FAB_EMAIL_REGEX.test(formData.email)) {
      newErrors.email =
        "Por favor, utilize um email institucional (@fab.mil.br).";
    } else {
      newErrors.email = "";
    }

    // Password validation
    if (formData.password && formData.password.length < 6) {
      newErrors.password = "A senha deve ter pelo menos 6 caracteres.";
    } else {
      newErrors.password = "";
    }

    // Confirm password validation
    if (
      formData.confirmPassword &&
      formData.password !== formData.confirmPassword
    ) {
      newErrors.confirmPassword = "As senhas não coincidem.";
    } else {
      newErrors.confirmPassword = "";
    }

    setFieldErrors(newErrors);
  }, [formData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setApiError(""); // Clear API error when user types
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const hasErrors = Object.values(fieldErrors).some((error) => error !== "");
  const isFormValid =
    Object.values(formData).every((value) => value.trim() !== "") &&
    !hasErrors; /*  &&
    acceptTerms */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      setApiError("Por favor, corrija os erros no formulário.");
      return;
    }

    setIsSubmitting(true);
    setApiError("");

    try {
      await signUp(formData.email, formData.password);
      setIsSuccess(true);
    } catch (err: any) {
      console.error("Falha no registro:", err);
      setApiError(
        err.message || "Ocorreu um erro ao criar a conta. Tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Verificando autenticação...</span>
        </CardContent>
      </Card>
    );
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center flex items-center justify-center">
            <CheckCircle className="mr-2 h-8 w-8 text-green-500" />
            Conta Criada!
          </CardTitle>
          <CardDescription className="text-center pt-4 space-y-2">
            <p>
              Enviamos um link de confirmação para{" "}
              <strong>{formData.email}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Por favor, verifique sua caixa de entrada (e a pasta de spam) para
              ativar sua conta.
            </p>
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col space-y-3">
          <Link to="/login" className="w-full">
            <Button className="w-full">Ir para Login</Button>
          </Link>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setIsSuccess(false);
              setFormData({
                email: "",
                password: "",
                confirmPassword: "",
              });
            }}
          >
            Criar Outra Conta
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Criar Conta</CardTitle>
        <CardDescription className="text-center">
          Acesso restrito a emails @fab.mil.br
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {apiError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Institucional</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="seu.nome@fab.mil.br"
                value={formData.email}
                onChange={(e) =>
                  handleInputChange("email", e.target.value.toLowerCase())
                }
                className={cn("pl-10", {
                  "border-red-500 focus-visible:ring-red-500":
                    fieldErrors.email,
                  "border-green-500 focus-visible:ring-green-500":
                    formData.email && !fieldErrors.email,
                })}
                required
                disabled={isSubmitting}
                autoComplete="email"
              />
              {formData.email && !fieldErrors.email && (
                <Check className="absolute right-3 top-3 h-4 w-4 text-green-500" />
              )}
            </div>
            {fieldErrors.email && (
              <p className="text-sm text-red-600 mt-1 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className={cn("pl-10 pr-10", {
                  "border-red-500 focus-visible:ring-red-500":
                    fieldErrors.password,
                })}
                required
                disabled={isSubmitting}
                autoComplete="new-password"
                minLength={6}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Progress
                    value={(passwordStrength.score / 5) * 100}
                    className="flex-1 h-2"
                  />
                  <span
                    className={cn("text-xs font-medium", {
                      "text-red-500": passwordStrength.strength === "weak",
                      "text-yellow-500": passwordStrength.strength === "medium",
                      "text-green-500": passwordStrength.strength === "strong",
                    })}
                  >
                    {passwordStrength.strength === "weak" && "Fraca"}
                    {passwordStrength.strength === "medium" && "Média"}
                    {passwordStrength.strength === "strong" && "Forte"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div
                    className={cn("flex items-center", {
                      "text-green-600": passwordStrength.checks.length,
                      "text-gray-400": !passwordStrength.checks.length,
                    })}
                  >
                    {passwordStrength.checks.length ? (
                      <Check className="h-3 w-3 mr-1" />
                    ) : (
                      <X className="h-3 w-3 mr-1" />
                    )}
                    8+ caracteres
                  </div>
                  <div
                    className={cn("flex items-center", {
                      "text-green-600": passwordStrength.checks.uppercase,
                      "text-gray-400": !passwordStrength.checks.uppercase,
                    })}
                  >
                    {passwordStrength.checks.uppercase ? (
                      <Check className="h-3 w-3 mr-1" />
                    ) : (
                      <X className="h-3 w-3 mr-1" />
                    )}
                    Maiúscula
                  </div>
                  <div
                    className={cn("flex items-center", {
                      "text-green-600": passwordStrength.checks.lowercase,
                      "text-gray-400": !passwordStrength.checks.lowercase,
                    })}
                  >
                    {passwordStrength.checks.lowercase ? (
                      <Check className="h-3 w-3 mr-1" />
                    ) : (
                      <X className="h-3 w-3 mr-1" />
                    )}
                    Minúscula
                  </div>
                  <div
                    className={cn("flex items-center", {
                      "text-green-600": passwordStrength.checks.numbers,
                      "text-gray-400": !passwordStrength.checks.numbers,
                    })}
                  >
                    {passwordStrength.checks.numbers ? (
                      <Check className="h-3 w-3 mr-1" />
                    ) : (
                      <X className="h-3 w-3 mr-1" />
                    )}
                    Número
                  </div>
                </div>
              </div>
            )}

            {fieldErrors.password && (
              <p className="text-sm text-red-600 mt-1 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) =>
                  handleInputChange("confirmPassword", e.target.value)
                }
                className={cn("pl-10 pr-10", {
                  "border-red-500 focus-visible:ring-red-500":
                    fieldErrors.confirmPassword,
                  "border-green-500 focus-visible:ring-green-500":
                    formData.confirmPassword &&
                    !fieldErrors.confirmPassword &&
                    formData.password === formData.confirmPassword,
                })}
                required
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isSubmitting}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
              {formData.confirmPassword &&
                !fieldErrors.confirmPassword &&
                formData.password === formData.confirmPassword && (
                  <Check className="absolute right-10 top-3 h-4 w-4 text-green-500" />
                )}
            </div>
            {fieldErrors.confirmPassword && (
              <p className="text-sm text-red-600 mt-1 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          {/* Terms and Conditions */}
          {/* <div className="flex items-start space-x-2 pt-2">
            <input
              id="terms"
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="rounded border-gray-300 mt-1"
              disabled={isSubmitting}
              title="Aceitar os Termos de Uso e Política de Privacidade"
              placeholder="Aceitar os Termos"
            />
            <Label htmlFor="terms" className="text-sm font-normal leading-5">
              Eu aceito os{" "}
              <Link
                to="/terms"
                className="text-primary hover:underline"
                target="_blank"
              >
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link
                to="/privacy"
                className="text-primary hover:underline"
                target="_blank"
              >
                Política de Privacidade
              </Link>
            </Label>
          </div> */}
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full my-6 py-3 text-lg font-semibold"
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Criando conta..." : "Criar Conta"}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            Já tem uma conta?{" "}
            <Link
              to="/login"
              className="text-primary hover:underline font-medium"
            >
              Faça login
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
