import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Pencil, Eye, EyeOff, Check, AlertTriangle, Layers, Loader2 } from 'lucide-react';
import { AdminPasswordModal } from '@/components/AdminPasswordModal';
import { useAdminPassword } from '@/hooks/useAdminPassword';
import { useModuleSettingsContext, DEFAULT_MODULES } from '@/contexts/ModuleSettingsContext';
import { toast } from 'sonner';

interface ModulosSectionProps {
  companyId: string;
}

type PendingAction = {
  type: 'disable' | 'enable' | 'view';
  moduleKey?: string;
};

export const ModulosSection = ({ companyId }: ModulosSectionProps) => {
  const { modules, loading, toggleModule, getDisabledModules } = useModuleSettingsContext();
  const { hasAdminPassword } = useAdminPassword();
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [showDisabledModal, setShowDisabledModal] = useState(false);
  const [confirmDisableDialog, setConfirmDisableDialog] = useState(false);
  const [moduleToDisable, setModuleToDisable] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState<string | null>(null);

  const handleDisableClick = async (moduleKey: string) => {
    const hasPassword = await hasAdminPassword(companyId);
    if (hasPassword) {
      setPendingAction({ type: 'disable', moduleKey });
      setShowPasswordModal(true);
    } else {
      setModuleToDisable(moduleKey);
      setConfirmDisableDialog(true);
    }
  };

  const handleViewDisabledClick = async () => {
    const hasPassword = await hasAdminPassword(companyId);
    if (hasPassword) {
      setPendingAction({ type: 'view' });
      setShowPasswordModal(true);
    } else {
      setShowDisabledModal(true);
    }
  };

  const handleEnableClick = async (moduleKey: string) => {
    const hasPassword = await hasAdminPassword(companyId);
    if (hasPassword) {
      setPendingAction({ type: 'enable', moduleKey });
      setShowPasswordModal(true);
    } else {
      await proceedWithEnable(moduleKey);
    }
  };

  const handlePasswordSuccess = () => {
    if (!pendingAction) return;

    if (pendingAction.type === 'disable' && pendingAction.moduleKey) {
      setModuleToDisable(pendingAction.moduleKey);
      setConfirmDisableDialog(true);
    } else if (pendingAction.type === 'enable' && pendingAction.moduleKey) {
      proceedWithEnable(pendingAction.moduleKey);
    } else if (pendingAction.type === 'view') {
      setShowDisabledModal(true);
    }

    setPendingAction(null);
  };

  const proceedWithDisable = async () => {
    if (!moduleToDisable) return;
    
    setIsToggling(moduleToDisable);
    const success = await toggleModule(moduleToDisable, false);
    setIsToggling(null);
    
    if (success) {
      const moduleName = DEFAULT_MODULES.find(m => m.key === moduleToDisable)?.name || moduleToDisable;
      toast.success(`Módulo "${moduleName}" desativado com sucesso`);
    } else {
      toast.error('Erro ao desativar módulo');
    }
    
    setConfirmDisableDialog(false);
    setModuleToDisable(null);
  };

  const proceedWithEnable = async (moduleKey: string) => {
    setIsToggling(moduleKey);
    const success = await toggleModule(moduleKey, true);
    setIsToggling(null);
    
    if (success) {
      const moduleName = DEFAULT_MODULES.find(m => m.key === moduleKey)?.name || moduleKey;
      toast.success(`Módulo "${moduleName}" reativado com sucesso`);
    } else {
      toast.error('Erro ao reativar módulo');
    }
  };

  const disabledModules = getDisabledModules();
  const enabledModules = modules.filter(m => m.is_enabled);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Módulos do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Módulos do Sistema
          </CardTitle>
          <CardDescription>
            Ative ou desative funcionalidades do sistema conforme a necessidade da sua barbearia
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* View Disabled Modules Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewDisabledClick}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Ver Desativados ({disabledModules.length})
            </Button>
          </div>

          {/* Enabled Modules List */}
          <div className="grid gap-3">
            {enabledModules.map((module) => (
              <div
                key={module.module_key}
                className="flex items-center justify-between p-3 rounded-lg border bg-card transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30">
                    Ativo
                  </Badge>
                  <span className="font-medium">{module.module_name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDisableClick(module.module_key)}
                  title="Desativar módulo"
                  disabled={isToggling === module.module_key}
                >
                  {isToggling === module.module_key ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            ))}
          </div>

          {enabledModules.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              Nenhum módulo ativo. Use o botão "Ver Desativados" para reativar módulos.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Admin Password Modal */}
      <AdminPasswordModal
        open={showPasswordModal}
        onOpenChange={setShowPasswordModal}
        companyId={companyId}
        onSuccess={handlePasswordSuccess}
        actionDescription="gerenciar módulos do sistema"
      />

      {/* Confirm Disable Dialog */}
      <Dialog open={confirmDisableDialog} onOpenChange={setConfirmDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Desativar Módulo
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja desativar o módulo "{DEFAULT_MODULES.find(m => m.key === moduleToDisable)?.name}"?
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Ao desativar este módulo:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Ele será removido do menu lateral</li>
              <li>Os dados não serão contabilizados nos relatórios</li>
              <li>A funcionalidade não estará disponível</li>
            </ul>
            <p className="text-foreground font-medium mt-2">
              Você pode reativar a qualquer momento pelo botão "Ver Desativados".
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmDisableDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={proceedWithDisable} disabled={isToggling !== null}>
              {isToggling !== null ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Desativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Disabled Modules Modal */}
      <Dialog open={showDisabledModal} onOpenChange={setShowDisabledModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <EyeOff className="h-5 w-5" />
              Módulos Desativados
            </DialogTitle>
            <DialogDescription>
              Módulos que foram desabilitados e não aparecem no menu
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {disabledModules.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhum módulo desativado
              </p>
            ) : (
              disabledModules.map((module) => (
                <div
                  key={module.module_key}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-red-500/20 text-red-600 border-red-500/30">
                      Desativado
                    </Badge>
                    <span className="font-medium">{module.module_name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEnableClick(module.module_key)}
                    title="Reativar módulo"
                    disabled={isToggling === module.module_key}
                    className="text-green-600 hover:text-green-700 hover:bg-green-500/10"
                  >
                    {isToggling === module.module_key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisabledModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
