import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Shield, Mail, Lock, AlertTriangle, Loader2, Key, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const SuperAdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [generatingPassword, setGeneratingPassword] = useState(false);
  
  const { login, isAuthenticated } = useSuperAdmin();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  if (isAuthenticated) {
    navigate('/super-admin/dashboard');
    return null;
  }

  const handleGeneratePassword = async () => {
    setGeneratingPassword(true);
    setError('');
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-super-admin-password');
      
      if (fnError) throw fnError;
      
      if (data?.success) {
        if (data?.email_sent) {
          toast.success('Senha gerada e enviada para o seu e-mail! Verifique sua caixa de entrada.');
        } else {
          toast.warning('Senha gerada, mas houve um problema ao enviar o e-mail. Tente novamente.');
        }
      } else {
        toast.error('Erro ao gerar senha. Tente novamente.');
      }
    } catch (err: any) {
      console.error('Error generating password:', err);
      setError('Erro ao gerar senha. Tente novamente.');
    } finally {
      setGeneratingPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email.trim(), password);
      
      if (result.success) {
        toast.success('Login realizado com sucesso!');
        navigate('/super-admin/dashboard');
      } else {
        setError(result.error || 'Erro ao fazer login');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50"
        onClick={() => navigate('/')}
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>
      <Card className="w-full max-w-md shadow-2xl border-primary/20">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center shadow-lg">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Super Admin</CardTitle>
            <CardDescription className="mt-2">
              Acesso restrito à administração da plataforma
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                E-mail Autorizado
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="corteearte.suporte@gmail.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Senha Diária
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite a senha enviada por e-mail"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                autoComplete="current-password"
                required
              />
              <p className="text-xs text-muted-foreground">
                A senha é gerada automaticamente e enviada para o e-mail às 00:00
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Acessar Painel
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Segurança Avançada
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Acesso exclusivo para e-mail autorizado</li>
              <li>• Senha dinâmica gerada diariamente</li>
              <li>• Validade de 24 horas por senha</li>
              <li>• Auditoria de todos os acessos</li>
            </ul>
          </div>

          <div className="mt-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowPasswordReset(!showPasswordReset)}
            >
              <Key className="w-4 h-4 mr-2" />
              {showPasswordReset ? 'Fechar' : 'Não recebi a senha — Gerar Nova'}
            </Button>

            {showPasswordReset && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                <p className="text-sm text-muted-foreground">
                  Uma nova senha será gerada e enviada para o e-mail autorizado:
                </p>
                <div className="flex items-center gap-2 p-2 bg-background border rounded-lg text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="font-mono">corteearte.suporte@gmail.com</span>
                </div>
                
                <Button
                  type="button"
                  onClick={handleGeneratePassword}
                  disabled={generatingPassword}
                  className="w-full"
                >
                  {generatingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando para o e-mail...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Gerar e Enviar por E-mail
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  🔒 Por segurança, a senha é enviada apenas por e-mail e não é exibida na tela.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminLogin;
