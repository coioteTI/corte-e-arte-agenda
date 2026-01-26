import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CriarSenha = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Validation states
  const hasMinLength = password.length >= 6;
  const passwordsMatch = password === confirmPassword && password.length > 0;

  useEffect(() => {
    checkFirstAccess();
  }, []);

  const checkFirstAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // No user logged in, redirect to login
        navigate("/login");
        return;
      }

      // Check if user needs to create password
      const { data: profiles } = await supabase
        .from('profiles')
        .select('is_first_access')
        .eq('user_id', user.id)
        .limit(1);

      const profile = Array.isArray(profiles) ? profiles[0] : profiles;

      if (!profile?.is_first_access) {
        // Not first access, redirect to normal flow
        navigate("/selecionar-filial");
        return;
      }

      setCheckingAccess(false);
    } catch (error) {
      console.error('Error checking first access:', error);
      navigate("/login");
    }
  };

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasMinLength) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter no mínimo 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        title: "Senhas não coincidem",
        description: "Confirme que as senhas são iguais",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não encontrado",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      // Update password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: password,
      });

      if (passwordError) {
        toast({
          title: "Erro ao criar senha",
          description: passwordError.message,
          variant: "destructive",
        });
        return;
      }

      // Update profile to mark first access as complete
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_first_access: false })
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
      }

      toast({
        title: "Senha criada com sucesso!",
        description: "Agora você pode acessar o sistema normalmente.",
      });

      // Redirect to branch selection
      navigate("/selecionar-filial");
    } catch (error: any) {
      console.error('Error creating password:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar senha",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Criar Sua Senha</CardTitle>
          <CardDescription>
            Este é seu primeiro acesso. Defina uma senha segura para continuar usando o sistema.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleCreatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {password.length > 0 && (
                <div className={`text-xs flex items-center gap-1 ${hasMinLength ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {hasMinLength && <CheckCircle2 className="h-3 w-3" />}
                  Mínimo de 6 caracteres
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {confirmPassword.length > 0 && (
                <div className={`text-xs flex items-center gap-1 ${passwordsMatch ? 'text-green-600' : 'text-destructive'}`}>
                  {passwordsMatch ? <CheckCircle2 className="h-3 w-3" /> : null}
                  {passwordsMatch ? 'Senhas coincidem' : 'Senhas não coincidem'}
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !hasMinLength || !passwordsMatch}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando senha...
                </>
              ) : (
                "Criar Senha"
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              Sua senha será usada para acessar o sistema. Guarde-a em local seguro.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CriarSenha;
