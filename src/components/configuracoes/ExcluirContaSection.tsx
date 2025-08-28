import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface ExcluirContaSectionProps {
  companyId: string;
}

export const ExcluirContaSection = ({ companyId }: ExcluirContaSectionProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    if (confirmText !== "EXCLUIR TUDO") {
      toast({
        title: "Erro",
        description: 'Digite "EXCLUIR TUDO" para confirmar',
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      console.log('🗑️ Iniciando exclusão COMPLETA da conta...');

      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Sessão não encontrada');
      }

      console.log('📡 Chamando Edge Function para exclusão completa...');

      // Call Edge Function to completely delete account including auth user
      const { data, error } = await supabase.functions.invoke('delete-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        console.error('❌ Erro na Edge Function:', error);
        throw new Error(error.message || 'Erro ao chamar função de exclusão');
      }

      if (!data?.success) {
        console.error('❌ Falha na exclusão:', data);
        throw new Error(data?.error || 'Falha na exclusão da conta');
      }

      console.log('✅ Conta completamente excluída!');

      // Clear all local storage and session data
      localStorage.clear();
      sessionStorage.clear();

      // Sign out to clear any remaining session
      await supabase.auth.signOut();

      toast({
        title: "✅ Conta excluída com sucesso",
        description: "Sua conta foi completamente removida. Você precisará criar uma nova conta para acessar novamente.",
        duration: 5000,
      });

      // Force reload to clear any cached data and redirect to home
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (error) {
      console.error('❌ Erro na exclusão:', error);
      toast({
        title: "❌ Erro ao excluir conta",
        description: error instanceof Error ? error.message : "Não foi possível excluir a conta completamente. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDialogOpen(false);
      setConfirmText("");
    }
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Zona de Perigo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-destructive mb-2">⚠️ Atenção!</p>
          <p className="mb-2">Esta ação é irreversível. Todos os dados da sua loja, agendamentos, clientes e histórico serão apagados permanentemente.</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Todos os agendamentos serão cancelados</li>
            <li>Dados de clientes serão perdidos</li>
            <li>Histórico de relatórios será excluído</li>
            <li>Configurações personalizadas serão removidas</li>
          </ul>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir minha conta e todos os dados da minha loja
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">
                Confirmar exclusão de conta
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-destructive/10 p-4 rounded-lg">
                <p className="text-sm text-destructive font-medium">
                  Esta ação não pode ser desfeita!
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Todos os seus dados serão permanentemente excluídos.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-text">
                  Digite "EXCLUIR TUDO" para confirmar:
                </Label>
                <Input
                  id="confirm-text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="EXCLUIR TUDO"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || confirmText !== "EXCLUIR TUDO"}
                  className="flex-1"
                >
                  {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setConfirmText("");
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};