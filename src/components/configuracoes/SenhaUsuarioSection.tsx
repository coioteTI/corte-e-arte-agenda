import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Eye, EyeOff, Check, AlertTriangle, KeyRound } from 'lucide-react';

export const SenhaUsuarioSection = () => {
  const { toast } = useToast();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [saving, setSaving] = useState(false);

  const senhasValidas = novaSenha.length >= 6 && novaSenha === confirmarSenha;

  const handleAlterarSenha = async () => {
    if (!senhaAtual.trim()) {
      toast({
        title: "Erro",
        description: "Digite sua senha atual para continuar.",
        variant: "destructive",
      });
      return;
    }

    if (!senhasValidas) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres e as senhas devem coincidir.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // First verify the current password by attempting to get current session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('Usuário não encontrado');
      }

      // Try to sign in with current password to verify it
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: senhaAtual,
      });

      if (verifyError) {
        toast({
          title: "Senha atual incorreta",
          description: "A senha atual informada não está correta.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: novaSenha,
      });

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "✅ Senha alterada com sucesso!",
        description: "Sua nova senha já está ativa.",
      });

      // Clear form
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Não foi possível alterar a senha. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-5 w-5 text-primary" />
          Alterar Minha Senha
        </CardTitle>
        <CardDescription>
          Altere sua senha de acesso ao sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Senha Atual */}
        <div className="space-y-2">
          <Label htmlFor="senha-atual">Senha Atual</Label>
          <div className="relative">
            <Input
              id="senha-atual"
              type={showSenhaAtual ? "text" : "password"}
              placeholder="Digite sua senha atual"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowSenhaAtual(!showSenhaAtual)}
            >
              {showSenhaAtual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Nova Senha */}
        <div className="space-y-2">
          <Label htmlFor="nova-senha">Nova Senha</Label>
          <div className="relative">
            <Input
              id="nova-senha"
              type={showNovaSenha ? "text" : "password"}
              placeholder="Digite a nova senha"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowNovaSenha(!showNovaSenha)}
            >
              {showNovaSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {novaSenha && novaSenha.length < 6 && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Mínimo 6 caracteres
            </p>
          )}
          {novaSenha.length >= 6 && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" />
              Senha válida
            </p>
          )}
        </div>

        {/* Confirmar Nova Senha */}
        <div className="space-y-2">
          <Label htmlFor="confirmar-senha">Confirmar Nova Senha</Label>
          <div className="relative">
            <Input
              id="confirmar-senha"
              type={showConfirmar ? "text" : "password"}
              placeholder="Confirme a nova senha"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowConfirmar(!showConfirmar)}
            >
              {showConfirmar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {confirmarSenha && confirmarSenha !== novaSenha && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              As senhas não coincidem
            </p>
          )}
          {confirmarSenha && confirmarSenha === novaSenha && novaSenha.length >= 6 && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" />
              Senhas coincidem
            </p>
          )}
        </div>

        <Button
          onClick={handleAlterarSenha}
          disabled={saving || !senhasValidas || !senhaAtual}
          className="w-full"
        >
          {saving ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Alterando senha...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Alterar Senha
            </div>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
