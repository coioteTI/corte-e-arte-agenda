import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface ExcluirContaSectionProps {
  companyId: string;
}

export const ExcluirContaSection = ({ companyId }: ExcluirContaSectionProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    if (!companyId) {
      toast({
        title: "Erro",
        description: "ID da empresa não encontrado.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      // Delete all related data in correct order to avoid foreign key constraints
      console.log('Starting account deletion process for company:', companyId);
      
      // 1. Delete appointments
      await supabase.from('appointments').delete().eq('company_id', companyId);
      console.log('Deleted appointments');
      
      // 2. Delete notification templates
      await supabase.from('notification_templates').delete().eq('company_id', companyId);
      console.log('Deleted notification templates');
      
      // 3. Delete services
      await supabase.from('services').delete().eq('company_id', companyId);
      console.log('Deleted services');
      
      // 4. Delete professionals
      await supabase.from('professionals').delete().eq('company_id', companyId);
      console.log('Deleted professionals');
      
      // 5. Delete clients (only those related to this company's appointments)
      const { data: clientIds } = await supabase
        .from('appointments')
        .select('client_id')
        .eq('company_id', companyId);
      
      if (clientIds && clientIds.length > 0) {
        const uniqueClientIds = [...new Set(clientIds.map(a => a.client_id))];
        await supabase.from('clients').delete().in('id', uniqueClientIds);
      }
      console.log('Deleted clients');
      
      // 6. Delete favorites related to this company
      await supabase.from('favorites').delete().eq('company_id', companyId);
      console.log('Deleted favorites');
      
      // 7. Delete subscriptions
      await supabase.from('subscriptions').delete().eq('company_id', companyId);
      console.log('Deleted subscriptions');
      
      // 8. Delete company settings
      await supabase.from('company_settings').delete().eq('company_id', companyId);
      console.log('Deleted company settings');
      
      // 9. Delete company logo from storage if exists
      try {
        const { data: files } = await supabase.storage
          .from('company-logos')
          .list(`${companyId}/`);
        
        if (files && files.length > 0) {
          const filePaths = files.map(file => `${companyId}/${file.name}`);
          await supabase.storage
            .from('company-logos')
            .remove(filePaths);
          console.log('Deleted logo files');
        }
      } catch (storageError) {
        console.log('No logo files to delete or error deleting:', storageError);
      }
      
      // 10. Delete company
      await supabase.from('companies').delete().eq('id', companyId);
      console.log('Deleted company');
      
      // 11. Delete user profile
      await supabase.from('profiles').delete().eq('user_id', user.id);
      console.log('Deleted profile');
      
      // 12. Finally, sign out and delete auth user account
      await supabase.auth.signOut();
      
      // Show success message
      toast({
        title: "Conta excluída com sucesso",
        description: "Sua conta e todos os dados foram excluídos permanentemente.",
      });
      
      // Redirect to login
      navigate('/login');
      
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Erro ao excluir conta",
        description: "Não foi possível excluir a conta. Tente novamente ou entre em contato com o suporte.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Zona de Perigo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-medium text-red-800 mb-2">Excluir Conta Permanentemente</h3>
          <p className="text-sm text-red-700 mb-4">
            Esta ação irá excluir permanentemente sua conta, empresa e todos os dados relacionados:
          </p>
          <ul className="text-sm text-red-700 space-y-1 mb-4">
            <li>• Todos os agendamentos e histórico</li>
            <li>• Clientes cadastrados</li>
            <li>• Serviços e profissionais</li>
            <li>• Relatórios e estatísticas</li>
            <li>• Mensagens e notificações</li>
            <li>• Logo e arquivos da empresa</li>
            <li>• Sua conta de usuário</li>
          </ul>
          <p className="text-sm font-medium text-red-800">
            ⚠️ Esta ação é irreversível e não pode ser desfeita.
          </p>
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              className="w-full"
              disabled={isDeleting || !companyId}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? "Excluindo..." : "Excluir minha conta e todos os dados da loja"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-700">
                Confirmar Exclusão Permanente
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  <strong>Tem certeza que deseja excluir permanentemente sua barbearia, conta e todos os dados?</strong>
                </p>
                <p className="text-red-600">
                  Esta ação é irreversível e todos os seus dados serão perdidos para sempre.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="bg-red-600 hover:bg-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? "Excluindo..." : "Sim, excluir permanentemente"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};