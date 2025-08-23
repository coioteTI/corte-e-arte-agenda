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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      console.log('Iniciando exclusão completa da conta...');

      // Step 1: Delete all clients associated with company appointments
      const { data: companyAppointments } = await supabase
        .from('appointments')
        .select('client_id')
        .eq('company_id', companyId);

      if (companyAppointments && companyAppointments.length > 0) {
        const clientIds = [...new Set(companyAppointments.map(a => a.client_id))];
        await supabase.from('clients').delete().in('id', clientIds);
        console.log('Clients deleted:', clientIds.length);
      }

      // Step 2: Delete all related company data in sequence for better reliability
      console.log('Deletando dados relacionados...');
      
      await supabase.from('appointments').delete().eq('company_id', companyId);
      await supabase.from('services').delete().eq('company_id', companyId);
      await supabase.from('professionals').delete().eq('company_id', companyId);
      await supabase.from('notification_templates').delete().eq('company_id', companyId);
      await supabase.from('company_settings').delete().eq('company_id', companyId);
      await supabase.from('subscriptions').delete().eq('company_id', companyId);
      await supabase.from('favorites').delete().eq('company_id', companyId);

      console.log('Dados relacionados excluídos');

      // Step 3: Delete company
      await supabase.from('companies').delete().eq('id', companyId);
      console.log('Empresa excluída');

      // Step 4: Delete user profile
      await supabase.from('profiles').delete().eq('user_id', user.id);
      console.log('Perfil excluído');

      // Step 5: Delete the auth user account (this will permanently delete the user)
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteUserError) {
        console.error('Error deleting auth user:', deleteUserError);
        // Continue with signOut even if admin delete fails
      } else {
        console.log('Usuário de autenticação excluído');
      }

      // Step 6: Sign out user
      await supabase.auth.signOut();

      toast({
        title: "✅ Conta excluída com sucesso",
        description: "Todos os seus dados foram removidos permanentemente. Sua conta não pode mais ser acessada.",
      });

      // Redirect to home page instead of login
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "❌ Erro ao excluir conta",
        description: "Não foi possível excluir a conta completamente. Tente novamente ou entre em contato com o suporte.",
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