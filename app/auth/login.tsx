import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { AuthError } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock } from "lucide-react";
import { cn } from "@/lib/utils"; // Importe seu utilitário de classes (comum em projetos shadcn)

import type { Route } from "./+types/login";

const FAB_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@fab\.mil\.br$/;

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Login" },
    { name: "description", content: "Entrar no sistema" },
  ];
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [emailError, setEmailError] = useState("");

  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    if (newEmail && !FAB_EMAIL_REGEX.test(newEmail)) {
      setEmailError("Por favor, utilize um email institucional (@fab.mil.br).");
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!FAB_EMAIL_REGEX.test(email)) {
      setEmailError("O email fornecido não é um email válido da FAB.");
      return;
    }

    setIsSubmitting(true);
    setApiError("");
    setEmailError("");

    try {
      await signIn(email, password);
      navigate("/rancho");
    } catch (err: any) {
      console.error("Falha no login:", err);
      if (err instanceof AuthError) {
        if (err.message.includes("Email not confirmed")) {
          setApiError("Email não confirmado. Verifique sua caixa de entrada.");
        } else if (err.message.includes("Invalid login credentials")) {
          setApiError("Email ou senha inválidos. Por favor, tente novamente.");
        } else {
          setApiError("Ocorreu um erro durante a autenticação. Tente mais tarde.");
        }
      } else {
        setApiError("Ocorreu um erro desconhecido. Verifique sua conexão.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto gap-4">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Entrar</CardTitle>
        <CardDescription className="text-center">
          Acesso restrito a emails @fab.mil.br
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {apiError && (
            <Alert variant="destructive">
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Institucional</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="seu.nome@fab.mil.br"
                value={email}
                onChange={handleEmailChange}
                className={cn(
                  "pl-10",
                  { "border-red-500 focus-visible:ring-red-500": emailError }
                )}
                required
                disabled={isSubmitting}
              />
            </div>
            {emailError && <p className="text-sm text-red-600 mt-1">{emailError}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full mt-10" disabled={isSubmitting || !!emailError}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
          
          <p className="text-sm text-center text-muted-foreground">
            Não tem uma conta?{" "}
            <Link to="/register" className="text-primary hover:underline">
              Cadastre-se
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}