import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, KeyRound, Mail } from "lucide-react";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lembrarSenha, setLembrarSenha] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [isFirstAccessMode, setIsFirstAccessMode] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);
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

  const handleLogin = async (e: React.FormEvent) => {
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

  const handleFirstAccessRequest = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: "E-mail inválido",
        description: "Informe um e-mail válido para continuar.",
        variant: "destructive"
      });
      return;
    }

    setSendingResetEmail(true);
    try {
      // Send password reset email - this will allow user to set their password
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
      setIsFirstAccessMode(false);
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

  // First access mode - just email input
  if (isFirstAccessMode) {
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
              Informe seu e-mail para receber o link de criação de senha.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstAccessEmail">E-mail</Label>
              <Input
                id="firstAccessEmail"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
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
              onClick={() => setIsFirstAccessMode(false)}
            >
              ← Voltar ao login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
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
                onClick={() => setIsFirstAccessMode(true)}
                className="hover:underline p-0 h-auto text-primary"
              >
                <KeyRound className="h-3 w-3 mr-1" />
                Primeiro acesso? Clique aqui
              </Button>
            </div>
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