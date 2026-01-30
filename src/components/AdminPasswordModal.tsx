import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, AlertTriangle, KeyRound } from 'lucide-react';
import { useAdminPassword } from '@/hooks/useAdminPassword';
import { useBranch } from '@/contexts/BranchContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface AdminPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess: () => void;
  actionDescription?: string;
}

export const AdminPasswordModal = ({
  open,
  onOpenChange,
  companyId,
  onSuccess,
  actionDescription = 'realizar esta ação',
}: AdminPasswordModalProps) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  
  const { validateAdminPassword, loading, setAdminPassword } = useAdminPassword();
  const { userRole } = useBranch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('Digite a senha de administrador');
      return;
    }

    const isValid = await validateAdminPassword(companyId, password);

    if (isValid) {
      setPassword('');
      onOpenChange(false);
      onSuccess();
    } else {
      setError('Senha incorreta. Tente novamente.');
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    setNewPassword('');
    setConfirmNewPassword('');
    onOpenChange(false);
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 4) {
      toast.error('A nova senha deve ter pelo menos 4 caracteres');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setResetting(true);
    try {
      const success = await setAdminPassword(companyId, newPassword);
      if (success) {
        toast.success('Senha de administrador redefinida com sucesso!');
        setShowResetDialog(false);
        setNewPassword('');
        setConfirmNewPassword('');
        // Autenticar automaticamente com a nova senha
        onOpenChange(false);
        onSuccess();
      }
    } finally {
      setResetting(false);
    }
  };

  const isCeo = userRole === 'ceo';

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Senha de Administrador
            </DialogTitle>
            <DialogDescription>
              Para {actionDescription}, digite a senha de administrador.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Senha</Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="Digite a senha de administrador"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                autoFocus
              />
              {error && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {error}
                </p>
              )}
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
              {isCeo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary"
                  onClick={() => setShowResetDialog(true)}
                >
                  <KeyRound className="h-3 w-3 mr-1" />
                  Esqueci a senha
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Validando...' : 'Confirmar'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para redefinir senha (apenas CEO) */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Redefinir Senha de Administrador
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              Como CEO, você pode redefinir a senha de administrador. Digite uma nova senha abaixo.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-admin-password">Nova Senha</Label>
              <Input
                id="new-admin-password"
                type="password"
                placeholder="Digite a nova senha (mínimo 4 caracteres)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-admin-password">Confirmar Nova Senha</Label>
              <Input
                id="confirm-new-admin-password"
                type="password"
                placeholder="Confirme a nova senha"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
            </div>
            {newPassword.length > 0 && newPassword.length < 4 && (
              <p className="text-xs text-destructive">A senha deve ter pelo menos 4 caracteres</p>
            )}
            {newPassword.length >= 4 && confirmNewPassword.length > 0 && newPassword !== confirmNewPassword && (
              <p className="text-xs text-destructive">As senhas não coincidem</p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setNewPassword('');
              setConfirmNewPassword('');
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetPassword}
              disabled={resetting || newPassword.length < 4 || newPassword !== confirmNewPassword}
            >
              {resetting ? 'Redefinindo...' : 'Redefinir Senha'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
