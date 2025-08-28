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
      console.log('Iniciando exclusão completa da conta usando função de segurança...');

      // Usar a função de segurança do banco de dados para excluir todos os dados
      const { data, error } = await supabase.rpc('delete_user_account', {
        company_uuid: companyId
      });

      if (error) {
        console.error('Erro ao executar função de exclusão:', error);
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error('Falha na exclusão da conta');
      }

      console.log('Conta excluída com sucesso através da função de segurança');

      // Sign out user after successful deletion
      await supabase.auth.signOut();

      toast({
        title: "✅ Conta excluída com sucesso",
        description: "Todos os seus dados foram removidos permanentemente. Sua conta foi desconectada.",
      });

      // Redirect to home page
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "❌ Erro ao excluir conta",
        description: error instanceof Error ? error.message : "Não foi possível excluir a conta completamente. Tente novamente ou entre em contato com o suporte.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
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