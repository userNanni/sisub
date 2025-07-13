
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  ArrowRight, 
  RefreshCw,
  Building2,
  Shield,
  Clock
} from "lucide-react";
import supabase from "@/utils/supabase";
import Footer from "~/components/Footer";
import type { Route } from "./+types/confirm-email";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Confirmação de Email" },
    { name: "description", content: "confirme seu email" },
  ];
}

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      const token = searchParams.get('token');
      const type = searchParams.get('type');
      
      if (!token || type !== 'email') {
        setStatus('error');
        setMessage('Link de confirmação inválido ou expirado.');
        return;
      }

      try {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'email'
        });

        if (error) {
          if (error.message.includes('expired')) {
            setStatus('expired');
            setMessage('O link de confirmação expirou. Solicite um novo link.');
          } else {
            setStatus('error');
            setMessage(error.message || 'Erro ao confirmar email.');
          }
        } else if (data.user) {
          setStatus('success');
          setEmail(data.user.email || '');
          setMessage('Email confirmado com sucesso! Você já pode fazer login.');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage('Erro inesperado ao confirmar email.');
        console.error('Erro na confirmação:', err);
      }
    };

    confirmEmail();
  }, [searchParams]);

  const handleResendConfirmation = async () => {
    if (!email) {
      setMessage('Email não encontrado para reenvio.');
      return;
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) {
        setMessage('Erro ao reenviar confirmação: ' + error.message);
      } else {
        setMessage('Nova confirmação enviada para seu email!');
      }
    } catch (err: any) {
      setMessage('Erro ao reenviar confirmação.');
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
              <CardTitle className="text-2xl">Confirmando email...</CardTitle>
              <CardDescription>
                Aguarde enquanto verificamos seu email
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="space-y-4">
                <div className="flex justify-center">
                  <Badge variant="outline" className="px-4 py-2">
                    <Clock className="h-4 w-4 mr-2" />
                    Processando
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Este processo pode levar alguns segundos...
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 'success':
        return (
          <Card className="max-w-md mx-auto border-green-200">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-900">Email confirmado!</CardTitle>
              <CardDescription>
                Sua conta foi ativada com sucesso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {message}
                </AlertDescription>
              </Alert>

              {email && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>Email confirmado:</span>
                  </div>
                  <p className="font-medium text-gray-900 mt-1">{email}</p>
                </div>
              )}

              <div className="space-y-3">
                <Link to="/login" className="block">
                  <Button className="w-full" size="lg">
                    Fazer Login
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                
                <Link to="/" className="block">
                  <Button variant="outline" className="w-full">
                    Voltar ao Início
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        );

      case 'expired':
        return (
          <Card className="max-w-md mx-auto border-yellow-200">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <CardTitle className="text-2xl text-yellow-900">Link expirado</CardTitle>
              <CardDescription>
                O link de confirmação não é mais válido
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-yellow-200 bg-yellow-50">
                <Clock className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  {message}
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                {email && (
                  <Button 
                    onClick={handleResendConfirmation}
                    className="w-full" 
                    size="lg"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reenviar Confirmação
                  </Button>
                )}
                
                <Link to="/register" className="block">
                  <Button variant="outline" className="w-full">
                    Criar Nova Conta
                  </Button>
                </Link>
                
                <Link to="/" className="block">
                  <Button variant="ghost" className="w-full">
                    Voltar ao Início
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        );

      case 'error':
      default:
        return (
          <Card className="max-w-md mx-auto border-red-200">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-red-900">Erro na confirmação</CardTitle>
              <CardDescription>
                Não foi possível confirmar seu email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  {message}
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Link to="/register" className="block">
                  <Button className="w-full" size="lg">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Tentar Novamente
                  </Button>
                </Link>
                
                <Link to="/login" className="block">
                  <Button variant="outline" className="w-full">
                    Ir para Login
                  </Button>
                </Link>
                
                <Link to="/" className="block">
                  <Button variant="ghost" className="w-full">
                    Voltar ao Início
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center space-x-3 mb-8">
          <Building2 className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Sistema de Rancho Militar</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {renderContent()}
      </div>

      {/* Info Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Próximos passos</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">1. Login Seguro</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Acesse sua conta com as credenciais cadastradas
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <Building2 className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">2. Selecione Unidade</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Configure sua unidade militar (ex: DIRAD)
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                  <Mail className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg">3. Planeje Refeições</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Marque suas refeições para os próximos 30 dias
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer/>
    </div>
  );
}