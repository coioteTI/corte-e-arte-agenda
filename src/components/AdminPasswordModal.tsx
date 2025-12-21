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
import { Lock, AlertTriangle } from 'lucide-react';
import { useAdminPassword } from '@/hooks/useAdminPassword';

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
  const { validateAdminPassword, loading } = useAdminPassword();

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
    onOpenChange(false);
  };

  return (
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

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Validando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
