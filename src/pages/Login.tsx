import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lembrarSenha, setLembrarSenha] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
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
      
      toast({
        title: "Login realizado com sucesso!",
        description: "Redirecionando para o dashboard...",
      });
      navigate("/dashboard");
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

  const handleEsqueciSenha = () => {
    navigate("/forgot-password");
  };

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

            {/* Esqueci senha */}
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={handleEsqueciSenha}
                className="text-sm hover:underline p-0"
              >
                Esqueci minha senha
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