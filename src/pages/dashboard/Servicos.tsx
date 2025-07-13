import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tag } from "lucide-react";

const Servicos = () => {
  const [servicos, setServicos] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedServico, setSelectedServico] = useState<any>(null);
  const [companyId, setCompanyId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [editingServico, setEditingServico] = useState({
    nome: "",
    descricao: "",
    duracao: "",
    valor: "",
    profissional: "",
    isPromocao: false,
    valorPromocional: "",
    validadePromocao: ""
  });
  const [novoServico, setNovoServico] = useState({
    nome: "",
    descricao: "",
    duracao: "",
    valor: "",
    profissional: "",
    isPromocao: false,
    valorPromocional: "",
    validadePromocao: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get company ID
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!company) return;
      
      setCompanyId(company.id);

      // Load services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('company_id', company.id);

      setServicos(servicesData || []);
    } catch (error) {
      console.error('Error loading company data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddServico = async () => {
    if (!novoServico.nome || !novoServico.duracao || !novoServico.valor) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('services')
        .insert({
          name: novoServico.nome,
          description: novoServico.descricao,
          duration: parseInt(novoServico.duracao),
          price: parseFloat(novoServico.valor),
          company_id: companyId,
          is_promotion: novoServico.isPromocao,
          promotional_price: novoServico.valorPromocional ? parseFloat(novoServico.valorPromocional) : null,
          promotion_valid_until: novoServico.validadePromocao || null
        });

      if (error) throw error;

      setNovoServico({
        nome: "",
        descricao: "",
        duracao: "",
        valor: "",
        profissional: "",
        isPromocao: false,
        valorPromocional: "",
        validadePromocao: ""
      });
      setIsDialogOpen(false);
      
      // Reload services
      loadCompanyData();
      
      toast({
        title: "Serviço cadastrado com sucesso!",
        description: "O serviço foi adicionado à sua lista."
      });
    } catch (error) {
      console.error('Error creating service:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível cadastrar o serviço.",
        variant: "destructive"
      });
    }
  };

  const handleEditServico = (servico: any) => {
    setSelectedServico(servico);
    setEditingServico({
      nome: servico.name,
      descricao: servico.description,
      duracao: servico.duration.toString(),
      valor: servico.price.toString(),
      profissional: servico.professional || "",
      isPromocao: servico.is_promotion || false,
      valorPromocional: servico.promotional_price ? servico.promotional_price.toString() : "",
      validadePromocao: servico.promotion_valid_until || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingServico.nome || !editingServico.duracao || !editingServico.valor) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('services')
        .update({
          name: editingServico.nome,
          description: editingServico.descricao,
          duration: parseInt(editingServico.duracao),
          price: parseFloat(editingServico.valor),
          is_promotion: editingServico.isPromocao,
          promotional_price: editingServico.valorPromocional ? parseFloat(editingServico.valorPromocional) : null,
          promotion_valid_until: editingServico.validadePromocao || null
        })
        .eq('id', selectedServico.id);

      if (error) throw error;
      
      setIsEditDialogOpen(false);
      setSelectedServico(null);
      
      // Reload services
      loadCompanyData();
      
      toast({
        title: "Serviço atualizado com sucesso!",
        description: "As alterações foram salvas."
      });
    } catch (error) {
      console.error('Error updating service:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar o serviço.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveServico = async (id: string) => {
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Reload services
      loadCompanyData();
      
      toast({
        title: "Serviço removido",
        description: "O serviço foi removido da lista"
      });
    } catch (error) {
      console.error('Error deleting service:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o serviço.",
        variant: "destructive"
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Serviços</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>Adicionar Serviço</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Serviço</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do serviço*</Label>
                  <Input
                    id="nome"
                    placeholder="Ex: Corte Masculino"
                    value={novoServico.nome}
                    onChange={(e) => setNovoServico({...novoServico, nome: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    placeholder="Descrição do serviço"
                    value={novoServico.descricao}
                    onChange={(e) => setNovoServico({...novoServico, descricao: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duracao">Duração (min)*</Label>
                    <Input
                      id="duracao"
                      type="number"
                      placeholder="30"
                      value={novoServico.duracao}
                      onChange={(e) => setNovoServico({...novoServico, duracao: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor (R$)*</Label>
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      placeholder="25.00"
                      value={novoServico.valor}
                      onChange={(e) => setNovoServico({...novoServico, valor: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="profissional">Profissional responsável</Label>
                  <Input
                    id="profissional"
                    placeholder="Ex: Pedro"
                    value={novoServico.profissional}
                    onChange={(e) => setNovoServico({...novoServico, profissional: e.target.value})}
                  />
                </div>

                {/* Seção de Promoção */}
                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="promocao"
                      checked={novoServico.isPromocao}
                      onCheckedChange={(checked) => 
                        setNovoServico({...novoServico, isPromocao: checked as boolean})
                      }
                    />
                    <Label htmlFor="promocao" className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Marcar este serviço como promoção
                    </Label>
                  </div>
                  
                  {novoServico.isPromocao && (
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <div className="space-y-2">
                        <Label htmlFor="valor-promocional">Valor promocional (R$)</Label>
                        <Input
                          id="valor-promocional"
                          type="number"
                          step="0.01"
                          placeholder="19.90"
                          value={novoServico.valorPromocional}
                          onChange={(e) => setNovoServico({...novoServico, valorPromocional: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="validade-promocao">Válido até</Label>
                        <Input
                          id="validade-promocao"
                          type="date"
                          value={novoServico.validadePromocao}
                          onChange={(e) => setNovoServico({...novoServico, validadePromocao: e.target.value})}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2 pt-4">
                  <Button onClick={handleAddServico} className="flex-1">
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Serviço</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nome">Nome do serviço*</Label>
                <Input
                  id="edit-nome"
                  placeholder="Ex: Corte Masculino"
                  value={editingServico.nome}
                  onChange={(e) => setEditingServico({...editingServico, nome: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-descricao">Descrição</Label>
                <Input
                  id="edit-descricao"
                  placeholder="Descrição do serviço"
                  value={editingServico.descricao}
                  onChange={(e) => setEditingServico({...editingServico, descricao: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-duracao">Duração (min)*</Label>
                  <Input
                    id="edit-duracao"
                    type="number"
                    placeholder="30"
                    value={editingServico.duracao}
                    onChange={(e) => setEditingServico({...editingServico, duracao: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-valor">Valor (R$)*</Label>
                  <Input
                    id="edit-valor"
                    type="number"
                    step="0.01"
                    placeholder="25.00"
                    value={editingServico.valor}
                    onChange={(e) => setEditingServico({...editingServico, valor: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-profissional">Profissional responsável</Label>
                <Input
                  id="edit-profissional"
                  placeholder="Ex: Pedro"
                  value={editingServico.profissional}
                  onChange={(e) => setEditingServico({...editingServico, profissional: e.target.value})}
                />
              </div>

              {/* Seção de Promoção - Edição */}
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-promocao"
                    checked={editingServico.isPromocao}
                    onCheckedChange={(checked) => 
                      setEditingServico({...editingServico, isPromocao: checked as boolean})
                    }
                  />
                  <Label htmlFor="edit-promocao" className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Marcar este serviço como promoção
                  </Label>
                </div>
                
                {editingServico.isPromocao && (
                  <div className="grid grid-cols-2 gap-4 pl-6">
                    <div className="space-y-2">
                      <Label htmlFor="edit-valor-promocional">Valor promocional (R$)</Label>
                      <Input
                        id="edit-valor-promocional"
                        type="number"
                        step="0.01"
                        placeholder="19.90"
                        value={editingServico.valorPromocional}
                        onChange={(e) => setEditingServico({...editingServico, valorPromocional: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-validade-promocao">Válido até</Label>
                      <Input
                        id="edit-validade-promocao"
                        type="date"
                        value={editingServico.validadePromocao}
                        onChange={(e) => setEditingServico({...editingServico, validadePromocao: e.target.value})}
                      />
                    </div>
                  </div>
                )}
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

        {/* Lista de Serviços */}
        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Carregando serviços...</p>
            </CardContent>
          </Card>
        ) : servicos.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground text-lg">
                Nenhum serviço cadastrado ainda
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Clique em "Adicionar Serviço" para começar
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {servicos.map((servico) => (
              <Card key={servico.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{servico.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {servico.description}
                    </p>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {servico.duration} min
                        </Badge>
                        {servico.is_promotion && (
                          <Badge variant="default" className="bg-red-500 text-white">
                            <Tag className="h-3 w-3 mr-1" />
                            PROMOÇÃO
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        {servico.is_promotion && servico.promotional_price ? (
                          <div className="flex flex-col items-end">
                            <span className="text-sm text-muted-foreground line-through">
                              R$ {servico.price.toFixed(2)}
                            </span>
                            <span className="font-semibold text-lg text-red-600">
                              R$ {servico.promotional_price.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="font-semibold text-lg">
                            R$ {servico.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleEditServico(servico)}
                      >
                        Editar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleRemoveServico(servico.id)}
                      >
                        Remover
                      </Button>
                    </div>
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

export default Servicos;