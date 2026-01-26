import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, CheckCircle, KeyRound, CheckCircle2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [senhaRedefinida, setSenhaRedefinida] = useState(false);
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Validation states
  const hasMinLength = novaSenha.length >= 6;
  const passwordsMatch = novaSenha === confirmarSenha && novaSenha.length > 0;

  useEffect(() => {
    // Verificar se há tokens na URL (vindos do link do e-mail)
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const type = searchParams.get('type');
    
    // Check if this is a recovery or first access
    if (type === 'recovery' || type === 'signup') {
      setIsFirstAccess(true);
    }
    
    if (accessToken && refreshToken) {
      // Definir a sessão com os tokens recebidos
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(async ({ data }) => {
        // Check if user has is_first_access flag
        if (data.user) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('is_first_access')
            .eq('user_id', data.user.id)
            .limit(1);
          
          const profile = Array.isArray(profiles) ? profiles[0] : profiles;
          if (profile?.is_first_access) {
            setIsFirstAccess(true);
          }
        }
      });
    }
  }, [searchParams]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasMinLength) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        title: "Senhas não coincidem",
        description: "Confirme que as senhas são iguais.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data: userData, error } = await supabase.auth.updateUser({
        password: novaSenha
      });

      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      // Update is_first_access to false if user has this flag
      if (userData.user) {
        await supabase
          .from('profiles')
          .update({ is_first_access: false })
          .eq('user_id', userData.user.id);
      }

      setSenhaRedefinida(true);
      toast({
        title: "Sucesso!",
        description: "Senha criada com sucesso. Agora você pode fazer login.",
      });

      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível criar a senha. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (senhaRedefinida) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-fade-in">
          <CardHeader className="text-center">
            <img 
              src={logo} 
              alt="Corte & Arte" 
              className="h-12 w-auto mx-auto mb-4"
            />
            <div className="mx-auto bg-green-100 dark:bg-green-900 p-3 rounded-full w-fit mb-2">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-xl text-green-600 dark:text-green-400">
              Senha Criada com Sucesso!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Sua senha foi criada. Agora você pode acessar o sistema usando seu e-mail e a nova senha.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecionando para o login...
            </p>
            <Button 
              onClick={() => navigate("/login")}
              className="w-full"
            >
              Ir para Login Agora
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const title = isFirstAccess ? "Criar Sua Senha" : "Redefinir Senha";
  const description = isFirstAccess 
    ? "Defina uma senha segura para acessar o sistema."
    : "Digite sua nova senha abaixo.";

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
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nova-senha">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="nova-senha"
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  required
                  className="pr-10"
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
              {novaSenha.length > 0 && (
                <div className={`text-xs flex items-center gap-1 ${hasMinLength ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {hasMinLength && <CheckCircle2 className="h-3 w-3" />}
                  Mínimo de 6 caracteres
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmar-senha">Confirmar Senha</Label>
              <div className="relative">
                <Input
                  id="confirmar-senha"
                  type={mostrarConfirmacao ? "text" : "password"}
                  placeholder="Repita a senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setMostrarConfirmacao(!mostrarConfirmacao)}
                >
                  {mostrarConfirmacao ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {confirmarSenha.length > 0 && (
                <div className={`text-xs flex items-center gap-1 ${passwordsMatch ? 'text-green-600' : 'text-destructive'}`}>
                  {passwordsMatch ? <CheckCircle2 className="h-3 w-3" /> : null}
                  {passwordsMatch ? 'Senhas coincidem' : 'Senhas não coincidem'}
                </div>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              size="lg" 
              disabled={isLoading || !hasMinLength || !passwordsMatch}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Criar Senha"
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              Esta senha será usada para todos os seus acessos futuros ao sistema.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;