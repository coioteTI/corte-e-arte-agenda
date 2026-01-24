import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, KeyRound, Mail, ArrowRight, Crown } from "lucide-react";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type LoginStep = 'email' | 'password' | 'first-access' | 'ceo-access';

const Login = () => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lembrarSenha, setLembrarSenha] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);
  const [step, setStep] = useState<LoginStep>('email');
  const [userMessage, setUserMessage] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Carregar dados salvos se existirem
    const emailSalvo = localStorage.getItem('email_salvo');
    const senhaSalva = localStorage.getItem('senha_salva');
    const lembrarLogin = localStorage.getItem('lembrar_login');
    
    if (emailSalvo && lembrarLogin === 'true') {
      setEmail(emailSalvo);
      setLembrarSenha(true);
      if (senhaSalva) {
        setSenha(senhaSalva);
      }
    }
  }, []);

  // Step 1: Verify email and determine user type
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast({
        title: "E-mail inválido",
        description: "Informe um e-mail válido para continuar.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Call edge function to check if user is CEO
      const { data, error } = await supabase.functions.invoke('ceo-login', {
        body: { email }
      });

      if (error) {
        console.error('Error checking user type:', error);
        toast({
          title: "Erro",
          description: "Não foi possível verificar o usuário.",
          variant: "destructive"
        });
        return;
      }

      if (data.isCeo && data.magicLink) {
        // CEO user - redirect to magic link for passwordless login
        setUserMessage(data.message || "Bem-vindo, CEO. Acesso liberado.");
        setStep('ceo-access');
        
        // Auto-redirect after showing message
        toast({
          title: "Bem-vindo, CEO!",
          description: "Acesso liberado. Redirecionando...",
        });
        
        // Redirect to magic link
        window.location.href = data.magicLink;
      } else if (data.isFirstAccess) {
        // First access - needs to create password
        setUserMessage(data.message || "Crie sua senha para continuar.");
        setStep('first-access');
      } else {
        // Regular user - needs password
        setUserMessage(data.message || "Informe sua senha para acessar o sistema.");
        setStep('password');
      }
    } catch (error: any) {
      console.error('Error in email verification:', error);
      toast({
        title: "Erro",
        description: "Erro ao verificar e-mail. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Handle password login for non-CEO users
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      if (lembrarSenha) {
        localStorage.setItem('lembrar_login', 'true');
        localStorage.setItem('email_salvo', email);
        localStorage.setItem('senha_salva', senha);
      } else {
        localStorage.removeItem('lembrar_login');
        localStorage.removeItem('email_salvo');
        localStorage.removeItem('senha_salva');
      }

      // Check if this is first access (user needs to create password)
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_first_access')
        .eq('user_id', data.user?.id)
        .single();

      if (profile?.is_first_access) {
        toast({
          title: "Primeiro acesso detectado",
          description: "Crie sua senha para continuar.",
        });
        navigate("/criar-senha");
        return;
      }
      
      // Verificar se o usuário tem um plano ativo
      const { data: companies } = await supabase
        .from('companies')
        .select('plan')
        .eq('user_id', data.user?.id)
        .single();

      const hasActivePlan = companies?.plan && companies.plan !== 'nenhum';
      
      if (!hasActivePlan) {
        toast({
          title: "Login realizado com sucesso!",
          description: "Escolha seu plano para continuar!",
        });
        navigate("/planos");
        return;
      }

      toast({
        title: "Login realizado com sucesso!",
        description: "Confirme seus dados para acessar o sistema...",
      });
      
      // Redirect to branch selection screen
      navigate("/selecionar-filial");
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: "Verifique suas credenciais e tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle first access - send password creation link
  const handleFirstAccessRequest = async () => {
    setSendingResetEmail(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "E-mail enviado!",
        description: "Verifique sua caixa de entrada para criar sua senha.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar o e-mail. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setSendingResetEmail(false);
    }
  };

  const handleEsqueciSenha = () => {
    navigate("/forgot-password");
  };

  const resetToEmail = () => {
    setStep('email');
    setSenha('');
    setUserMessage('');
  };

  // CEO Access - showing welcome message while redirecting
  if (step === 'ceo-access') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-fade-in">
          <CardHeader className="text-center">
            <img 
              src={logo} 
              alt="Corte & Arte" 
              className="h-12 w-auto mx-auto mb-4"
            />
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Bem-vindo, CEO!</CardTitle>
            <CardDescription>
              {userMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Redirecionando para o sistema...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // First Access - needs to create password
  if (step === 'first-access') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-fade-in">
          <CardHeader className="text-center">
            <img 
              src={logo} 
              alt="Corte & Arte" 
              className="h-12 w-auto mx-auto mb-4"
            />
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Primeiro Acesso</CardTitle>
            <CardDescription>
              {userMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                E-mail: <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>

            <Button 
              onClick={handleFirstAccessRequest}
              className="w-full" 
              disabled={sendingResetEmail}
            >
              {sendingResetEmail ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar Link para Criar Senha
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={resetToEmail}
            >
              ← Usar outro e-mail
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password Step - for non-CEO users
  if (step === 'password') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-fade-in">
          <CardHeader className="text-center">
            <img 
              src={logo} 
              alt="Corte & Arte" 
              className="h-12 w-auto mx-auto mb-4"
            />
            <CardTitle className="text-xl">Informe sua Senha</CardTitle>
            <CardDescription>
              {userMessage}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  E-mail: <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    autoFocus
                    className="pr-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                  >
                    {mostrarSenha ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lembrar"
                  checked={lembrarSenha}
                  onCheckedChange={(checked) => setLembrarSenha(checked as boolean)}
                />
                <Label htmlFor="lembrar" className="text-sm text-muted-foreground">
                  Lembrar minha senha neste dispositivo
                </Label>
              </div>
              
              <Button 
                type="submit" 
                className="w-full hover:scale-105 transition-transform duration-200" 
                size="lg" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>

              {/* Links de ações */}
              <div className="flex flex-col items-center gap-2 text-sm">
                <Button
                  type="button"
                  variant="link"
                  onClick={handleEsqueciSenha}
                  className="hover:underline p-0 h-auto"
                >
                  Esqueci minha senha
                </Button>
                <Button
                  type="button"
                  variant="link"
                  onClick={resetToEmail}
                  className="hover:underline p-0 h-auto text-muted-foreground"
                >
                  ← Usar outro e-mail
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email Step - initial step for all users
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <img 
            src={logo} 
            alt="Corte & Arte" 
            className="h-12 w-auto mx-auto mb-4"
          />
          <CardTitle className="text-xl">Entrar no Sistema</CardTitle>
          <CardDescription>
            Informe seu e-mail para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full hover:scale-105 transition-transform duration-200" 
              size="lg" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  Continuar
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center space-y-3">
            <div className="text-sm text-muted-foreground">
              Não tem uma conta?{" "}
              <Link to="/cadastro" className="text-foreground hover:underline font-medium">
                Cadastre sua barbearia
              </Link>
            </div>
            
            <div className="text-sm">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                ← Voltar ao início
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
