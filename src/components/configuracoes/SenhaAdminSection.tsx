import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Lock, Eye, EyeOff, Shield, Trash2 } from 'lucide-react';
import { useAdminPassword } from '@/hooks/useAdminPassword';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SenhaAdminSectionProps {
  companyId: string;
}

export const SenhaAdminSection = ({ companyId }: SenhaAdminSectionProps) => {
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [checkingPassword, setCheckingPassword] = useState(true);

  const { loading, setAdminPassword, hasAdminPassword, removeAdminPassword } = useAdminPassword();

  useEffect(() => {
    if (companyId) {
      checkPassword();
    }
  }, [companyId]);

  const checkPassword = async () => {
    setCheckingPassword(true);
    const exists = await hasAdminPassword(companyId);
    setHasPassword(exists);
    setCheckingPassword(false);
  };

  const handleSalvar = async () => {
    if (senha.length < 4) {
      return;
    }

    if (senha !== confirmarSenha) {
      return;
    }

    const success = await setAdminPassword(companyId, senha);
    if (success) {
      setSenha('');
      setConfirmarSenha('');
      setHasPassword(true);
    }
  };

  const handleRemover = async () => {
    const success = await removeAdminPassword(companyId);
    if (success) {
      setHasPassword(false);
    }
  };

  const senhasValidas = senha.length >= 4 && senha === confirmarSenha;

  if (checkingPassword) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4" />
          Senha de Administrador
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          A senha de administrador é exigida para realizar ações sensíveis como editar ou excluir
          itens do estoque e registros de pagamento.
        </p>

        {hasPassword ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <Lock className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400">
                Senha de administrador configurada
              </span>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Alterar senha:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nova-senha" className="text-sm">
                    Nova Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="nova-senha"
                      type={showSenha ? 'text' : 'password'}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Nova senha"
                      className="h-8 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-8 w-8 p-0"
                      onClick={() => setShowSenha(!showSenha)}
                    >
                      {showSenha ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmar-nova-senha" className="text-sm">
                    Confirmar Nova Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmar-nova-senha"
                      type={showConfirmar ? 'text' : 'password'}
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      placeholder="Confirmar senha"
                      className="h-8 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-8 w-8 p-0"
                      onClick={() => setShowConfirmar(!showConfirmar)}
                    >
                      {showConfirmar ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {senha.length > 0 && senha.length < 4 && (
                <p className="text-xs text-destructive">A senha deve ter pelo menos 4 caracteres</p>
              )}
              {senha.length >= 4 && confirmarSenha.length > 0 && senha !== confirmarSenha && (
                <p className="text-xs text-destructive">As senhas não coincidem</p>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remover Senha
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover Senha de Administrador?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ao remover a senha, as ações sensíveis poderão ser realizadas sem validação.
                      Você pode configurar uma nova senha a qualquer momento.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRemover} className="bg-destructive hover:bg-destructive/90">
                      Remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                onClick={handleSalvar}
                disabled={!senhasValidas || loading}
                size="sm"
              >
                {loading ? 'Salvando...' : 'Atualizar Senha'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <Lock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-yellow-600 dark:text-yellow-400">
                Nenhuma senha de administrador configurada
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="criar-senha" className="text-sm">
                  Criar Senha
                </Label>
                <div className="relative">
                  <Input
                    id="criar-senha"
                    type={showSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Digite uma senha"
                    className="h-8 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-8 w-8 p-0"
                    onClick={() => setShowSenha(!showSenha)}
                  >
                    {showSenha ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmar-criar-senha" className="text-sm">
                  Confirmar Senha
                </Label>
                <div className="relative">
                  <Input
                    id="confirmar-criar-senha"
                    type={showConfirmar ? 'text' : 'password'}
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="Confirme a senha"
                    className="h-8 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-8 w-8 p-0"
                    onClick={() => setShowConfirmar(!showConfirmar)}
                  >
                    {showConfirmar ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </div>

            {senha.length > 0 && senha.length < 4 && (
              <p className="text-xs text-destructive">A senha deve ter pelo menos 4 caracteres</p>
            )}
            {senha.length >= 4 && confirmarSenha.length > 0 && senha !== confirmarSenha && (
              <p className="text-xs text-destructive">As senhas não coincidem</p>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={handleSalvar} disabled={!senhasValidas || loading} size="sm">
                {loading ? 'Salvando...' : 'Criar Senha'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
