import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Upload, User, Mail, Phone, MapPin } from "lucide-react";
import { ContaEmpresaConfig } from "@/types/configuracoes";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface ContaEmpresaSectionProps {
  contaEmpresa: ContaEmpresaConfig;
  onInputChange: (campo: string, valor: string) => void;
  onSalvar: () => void;
  saving: boolean;
}

export const ContaEmpresaSection = ({ contaEmpresa, onInputChange, onSalvar, saving }: ContaEmpresaSectionProps) => {
  const [senhaConfirmacao, setSenhaConfirmacao] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleExcluirConta = async () => {
    if (!senhaConfirmacao.trim()) {
      toast({
        title: "Senha obrigatória",
        description: "Digite sua senha atual para confirmar a exclusão.",
        variant: "destructive",
      });
      return;
    }

    setExcluindo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Verify password by signing in
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: senhaConfirmacao
      });

      if (authError) {
        toast({
          title: "Senha incorreta",
          description: "A senha digitada não confere.",
          variant: "destructive",
        });
        return;
      }

      // Get company data
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (company) {
        // Delete company (cascade will handle related data)
        const { error: deleteError } = await supabase
          .from('companies')
          .delete()
          .eq('id', company.id);

        if (deleteError) throw deleteError;
      }

      // Sign out user
      await supabase.auth.signOut();

      toast({
        title: "Conta excluída",
        description: "Sua conta e todos os dados foram excluídos permanentemente.",
      });

      navigate("/");
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Erro ao excluir conta",
        description: "Não foi possível excluir a conta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setExcluindo(false);
      setSenhaConfirmacao("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Dados da Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Dados da Empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome-empresa" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nome da Empresa
              </Label>
              <Input
                id="nome-empresa"
                value={contaEmpresa.nome}
                onChange={(e) => onInputChange("nome", e.target.value)}
                placeholder="Nome da sua barbearia"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-empresa" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email de Acesso
              </Label>
              <Input
                id="email-empresa"
                type="email"
                value={contaEmpresa.email}
                onChange={(e) => onInputChange("email", e.target.value)}
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefone-empresa" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefone
              </Label>
              <Input
                id="telefone-empresa"
                value={contaEmpresa.telefone}
                onChange={(e) => onInputChange("telefone", e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cep-empresa">CEP</Label>
              <Input
                id="cep-empresa"
                value={contaEmpresa.cep}
                onChange={(e) => onInputChange("cep", e.target.value)}
                placeholder="00000-000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco-empresa" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Endereço
            </Label>
            <Input
              id="endereco-empresa"
              value={contaEmpresa.endereco}
              onChange={(e) => onInputChange("endereco", e.target.value)}
              placeholder="Rua, número"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cidade-empresa">Cidade</Label>
              <Input
                id="cidade-empresa"
                value={contaEmpresa.cidade}
                onChange={(e) => onInputChange("cidade", e.target.value)}
                placeholder="São Paulo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado-empresa">Estado</Label>
              <Input
                id="estado-empresa"
                value={contaEmpresa.estado}
                onChange={(e) => onInputChange("estado", e.target.value)}
                placeholder="SP"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Logo da Barbearia</Label>
            <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">
                Clique para fazer upload ou arraste sua logo aqui
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                Formatos aceitos: JPG, PNG (máx. 2MB)
              </p>
              <Button variant="outline" size="sm">
                Escolher Arquivo
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={onSalvar} disabled={saving}>
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Zona de Perigo */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <Trash2 className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-100 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-2">⚠️ Atenção!</h4>
            <p className="text-sm text-red-700 mb-3">
              Esta ação é <strong>irreversível</strong>. Todos os dados da sua loja, 
              agendamentos, clientes e histórico serão apagados permanentemente.
            </p>
            <ul className="text-xs text-red-600 space-y-1">
              <li>• Todos os agendamentos serão cancelados</li>
              <li>• Dados de clientes serão perdidos</li>
              <li>• Histórico de relatórios será excluído</li>
              <li>• Configurações personalizadas serão removidas</li>
            </ul>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir minha conta e todos os dados da minha loja
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-red-700">
                  Confirmar exclusão da conta
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    <strong>Esta ação não pode ser desfeita.</strong> Isso excluirá permanentemente 
                    sua conta e removerá todos os dados de nossos servidores.
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="senha-confirmacao" className="text-sm font-medium">
                      Digite sua senha atual para confirmar:
                    </Label>
                    <Input
                      id="senha-confirmacao"
                      type="password"
                      value={senhaConfirmacao}
                      onChange={(e) => setSenhaConfirmacao(e.target.value)}
                      placeholder="Sua senha atual"
                      className="border-red-200"
                    />
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSenhaConfirmacao("")}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleExcluirConta}
                  disabled={excluindo || !senhaConfirmacao.trim()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {excluindo ? "Excluindo..." : "Sim, excluir permanentemente"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};