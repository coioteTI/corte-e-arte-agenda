import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Edit, Trash2 } from "lucide-react";
import { ProfessionalAvatarUpload } from "@/components/ProfessionalAvatarUpload";
import { useBranch } from "@/contexts/BranchContext";

const Profissionais = () => {
  const { currentBranchId, userRole, companyId: branchCompanyId, loading: branchLoading } = useBranch();
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProfissional, setSelectedProfissional] = useState<any>(null);
  const [companyId, setCompanyId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [editingProfissional, setEditingProfissional] = useState({
    nome: "",
    email: "",
    telefone: "",
    especialidade: "",
    disponivel: true,
    avatar_url: null as string | null
  });
  const [novoProfissional, setNovoProfissional] = useState({
    nome: "",
    email: "",
    telefone: "",
    especialidade: "",
    disponivel: true,
    avatar_url: null as string | null
  });
  const { toast } = useToast();

  // Should filter by branch - CEO sees all, others see only their branch
  const shouldFilterByBranch = userRole !== 'ceo' && currentBranchId;

  useEffect(() => {
    if (!branchLoading) {
      loadCompanyData();
    }
  }, [currentBranchId, userRole, branchLoading]);

  const loadCompanyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Use companyId from BranchContext (works for both owners and employees)
      let resolvedCompanyId = branchCompanyId;

      // Fallback: Get company ID directly if not available from context
      if (!resolvedCompanyId) {
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        resolvedCompanyId = company?.id || null;
      }

      if (!resolvedCompanyId) {
        setLoading(false);
        return;
      }
      
      setCompanyId(resolvedCompanyId);

      // Build query with branch filtering
      let professionalsQuery = supabase
        .from('professionals')
        .select('*')
        .eq('company_id', resolvedCompanyId);

      if (shouldFilterByBranch) {
        professionalsQuery = professionalsQuery.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
      }

      const { data: professionalsData } = await professionalsQuery;

      setProfissionais(professionalsData || []);
    } catch (error) {
      console.error('Error loading company data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProfissional = async () => {
    if (!novoProfissional.nome) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (!companyId) {
      toast({
        title: "Erro",
        description: "Company ID não encontrado. Faça login novamente.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Adding professional with company_id:', companyId, 'branch_id:', currentBranchId);
      const { error } = await supabase
        .from('professionals')
        .insert({
          name: novoProfissional.nome,
          email: novoProfissional.email,
          phone: novoProfissional.telefone,
          specialty: novoProfissional.especialidade,
          company_id: companyId,
          branch_id: currentBranchId,
          is_available: novoProfissional.disponivel,
          avatar_url: novoProfissional.avatar_url
        });

      if (error) throw error;

      setNovoProfissional({
        nome: "",
        email: "",
        telefone: "",
        especialidade: "",
        disponivel: true,
        avatar_url: null
      });
      setIsDialogOpen(false);
      
      // Reload professionals
      loadCompanyData();
      
      toast({
        title: "Profissional cadastrado com sucesso!",
        description: "O profissional foi adicionado à sua equipe."
      });
    } catch (error) {
      console.error('Error creating professional:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível cadastrar o profissional.",
        variant: "destructive"
      });
    }
  };

  const handleEditProfissional = (profissional: any) => {
    setSelectedProfissional(profissional);
    setEditingProfissional({
      nome: profissional.name,
      email: profissional.email || "",
      telefone: profissional.phone || "",
      especialidade: profissional.specialty || "",
      disponivel: profissional.is_available ?? true,
      avatar_url: profissional.avatar_url || null
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingProfissional.nome) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('professionals')
        .update({
          name: editingProfissional.nome,
          email: editingProfissional.email,
          phone: editingProfissional.telefone,
          specialty: editingProfissional.especialidade,
          is_available: editingProfissional.disponivel,
          avatar_url: editingProfissional.avatar_url
        })
        .eq('id', selectedProfissional.id);

      if (error) throw error;
      
      setIsEditDialogOpen(false);
      setSelectedProfissional(null);
      
      // Reload professionals
      loadCompanyData();
      
      toast({
        title: "Profissional atualizado com sucesso!",
        description: "As alterações foram salvas."
      });
    } catch (error) {
      console.error('Error updating professional:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar o profissional.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveProfissional = async (id: string) => {
    try {
      const { error } = await supabase
        .from('professionals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Reload professionals
      loadCompanyData();
      
      toast({
        title: "Profissional removido",
        description: "O profissional foi removido da equipe"
      });
    } catch (error) {
      console.error('Error deleting professional:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o profissional.",
        variant: "destructive"
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Profissionais</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>Adicionar Profissional</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Profissional</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Avatar Upload */}
                <ProfessionalAvatarUpload
                  currentAvatarUrl={novoProfissional.avatar_url}
                  onAvatarChange={(url) => setNovoProfissional({...novoProfissional, avatar_url: url})}
                  professionalName={novoProfissional.nome}
                />

                <div className="space-y-2">
                  <Label htmlFor="nome">Nome*</Label>
                  <Input
                    id="nome"
                    placeholder="Nome completo"
                    value={novoProfissional.nome}
                    onChange={(e) => setNovoProfissional({...novoProfissional, nome: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={novoProfissional.email}
                    onChange={(e) => setNovoProfissional({...novoProfissional, email: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    placeholder="(11) 99999-9999"
                    value={novoProfissional.telefone}
                    onChange={(e) => setNovoProfissional({...novoProfissional, telefone: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="especialidade">Especialidade</Label>
                  <Input
                    id="especialidade"
                    placeholder="Ex: Cortes masculinos, Barba, etc."
                    value={novoProfissional.especialidade}
                    onChange={(e) => setNovoProfissional({...novoProfissional, especialidade: e.target.value})}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="disponivel"
                    checked={novoProfissional.disponivel}
                    onCheckedChange={(checked) => 
                      setNovoProfissional({...novoProfissional, disponivel: checked})
                    }
                  />
                  <Label htmlFor="disponivel">Profissional disponível para agendamentos</Label>
                </div>
                
                <div className="flex space-x-2 pt-4">
                  <Button onClick={handleAddProfissional} className="flex-1">
                    Adicionar
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Profissional</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Avatar Upload */}
              <ProfessionalAvatarUpload
                currentAvatarUrl={editingProfissional.avatar_url}
                onAvatarChange={(url) => setEditingProfissional({...editingProfissional, avatar_url: url})}
                professionalName={editingProfissional.nome}
              />

              <div className="space-y-2">
                <Label htmlFor="edit-nome">Nome*</Label>
                <Input
                  id="edit-nome"
                  placeholder="Nome completo"
                  value={editingProfissional.nome}
                  onChange={(e) => setEditingProfissional({...editingProfissional, nome: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-email">E-mail</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={editingProfissional.email}
                  onChange={(e) => setEditingProfissional({...editingProfissional, email: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-telefone">Telefone</Label>
                <Input
                  id="edit-telefone"
                  placeholder="(11) 99999-9999"
                  value={editingProfissional.telefone}
                  onChange={(e) => setEditingProfissional({...editingProfissional, telefone: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-especialidade">Especialidade</Label>
                <Input
                  id="edit-especialidade"
                  placeholder="Ex: Cortes masculinos, Barba, etc."
                  value={editingProfissional.especialidade}
                  onChange={(e) => setEditingProfissional({...editingProfissional, especialidade: e.target.value})}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-disponivel"
                  checked={editingProfissional.disponivel}
                  onCheckedChange={(checked) => 
                    setEditingProfissional({...editingProfissional, disponivel: checked})
                  }
                />
                <Label htmlFor="edit-disponivel">Profissional disponível para agendamentos</Label>
              </div>
              
              <div className="flex space-x-2 pt-4">
                <Button onClick={handleSaveEdit} className="flex-1">
                  Salvar Alterações
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Lista de Profissionais */}
        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Carregando profissionais...</p>
            </CardContent>
          </Card>
        ) : profissionais.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground text-lg">
                Nenhum profissional cadastrado ainda
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Cadastre profissionais para que apareçam nos agendamentos
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profissionais.map((profissional) => (
              <Card key={profissional.id}>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <div className="flex items-center space-x-3 flex-1">
                    <Avatar className="w-12 h-12 border-2 border-border">
                      <AvatarImage src={profissional.avatar_url || undefined} alt={profissional.name} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(profissional.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{profissional.name}</CardTitle>
                      {profissional.specialty && (
                        <p className="text-sm text-muted-foreground">{profissional.specialty}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={profissional.is_available ? "default" : "secondary"}>
                    {profissional.is_available ? "Disponível" : "Indisponível"}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {profissional.email && (
                      <p className="text-muted-foreground">📧 {profissional.email}</p>
                    )}
                    {profissional.phone && (
                      <p className="text-muted-foreground">📱 {profissional.phone}</p>
                    )}
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditProfissional(profissional)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleRemoveProfissional(profissional.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Profissionais;