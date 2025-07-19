import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./auth";
import { AuthError } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock, Hash, CheckCircle } from "lucide-react"; // Ícone 'User' trocado por 'Hash'
import { cn } from "@/lib/utils";

import type { Route } from "./+types/register";

const FAB_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@fab\.mil\.br$/;
const SARAM_REGEX = /^\d{7}$/;

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Registre-se" },
    { name: "description", content: "Registre-se no sistema" },
  ];
}

export default function Register() {
  const [saram, setSaram] = useState(""); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [apiError, setApiError] = useState("");
  const [saramError, setSaramError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const { signUp } = useAuth();

  useEffect(() => {
    if (password && confirmPassword && password !== confirmPassword) {
      setPasswordError("As senhas não coincidem.");
    } else {
      setPasswordError("");
    }
  }, [password, confirmPassword]);

  const handleSaramChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSaram = e.target.value;
    setSaram(newSaram);
    if (newSaram && !SARAM_REGEX.test(newSaram)) {
      setSaramError("O SARAM deve conter exatamente 7 dígitos.");
    } else {
      setSaramError("");
    }
  };

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
    
    setApiError("");
    
    if (saramError || emailError) return;
    if (password.length < 6) {
      setPasswordError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("As senhas não coincidem.");
      return;
    }

    setIsSubmitting(true);
    setPasswordError("");

    try {
      await signUp(email, password, { name: saram });
      setIsSuccess(true);
    } catch (err: any) {
      console.error("Falha no registro:", err);
      if (err instanceof AuthError) {
        if (err.message.includes("User already registered")) {
          setApiError("Este email já está cadastrado. Tente fazer login.");
        } else {
          setApiError("Ocorreu um erro ao criar a conta. Tente novamente.");
        }
      } else {
        setApiError("Ocorreu um erro desconhecido. Verifique sua conexão.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center flex items-center justify-center">
            <CheckCircle className="mr-2 h-8 w-8 text-green-500" />
            Conta Criada!
          </CardTitle>
          <CardDescription className="text-center pt-4">
            Enviamos um link de confirmação para o seu email. Por favor, verifique sua caixa de entrada (e a pasta de spam) para ativar sua conta.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link to="/login" className="w-full">
            <Button className="w-full">Voltar para o Login</Button>
          </Link>
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
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="saram">SARAM</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="saram" type="text" placeholder="0000000" value={saram} onChange={handleSaramChange} className={cn("pl-10", { "border-red-500 focus-visible:ring-red-500": saramError })} required disabled={isSubmitting} />
            </div>
            {saramError && <p className="text-sm text-red-600 mt-1">{saramError}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Institucional</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="email" type="email" placeholder="seu.nome@fab.mil.br" value={email} onChange={handleEmailChange} className={cn("pl-10", { "border-red-500 focus-visible:ring-red-500": emailError })} required disabled={isSubmitting} />
            </div>
            {emailError && <p className="text-sm text-red-600 mt-1">{emailError}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Senha (mínimo 6 caracteres)</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required disabled={isSubmitting} />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={cn("pl-10", { "border-red-500 focus-visible:ring-red-500": passwordError })} required disabled={isSubmitting} />
            </div>
            {passwordError && <p className="text-sm text-red-600 mt-1">{passwordError}</p>}
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full mt-10" disabled={isSubmitting || !!saramError || !!emailError || !!passwordError}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Criando conta..." : "Criar Conta"}
          </Button>
          
          <p className="text-sm text-center text-muted-foreground">
            Já tem uma conta?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Faça login
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}