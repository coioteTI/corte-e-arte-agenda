import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { Tag } from "lucide-react";

const servicosExemplo = [
  {
    id: 1,
    nome: "Corte Masculino",
    descricao: "Corte moderno e estilizado",
    duracao: 30,
    valor: 25.00,
    profissional: "Pedro",
    isPromocao: false,
    valorPromocional: null,
    validadePromocao: null
  },
  {
    id: 2,
    nome: "Barba",
    descricao: "Aparar e modelar barba",
    duracao: 20,
    valor: 15.00,
    profissional: "Pedro",
    isPromocao: true,
    valorPromocional: 12.00,
    validadePromocao: "2024-12-31"
  },
  {
    id: 3,
    nome: "Corte + Barba",
    descricao: "Pacote completo",
    duracao: 45,
    valor: 35.00,
    profissional: "Pedro",
    isPromocao: false,
    valorPromocional: null,
    validadePromocao: null
  },
];

const Servicos = () => {
  const [servicos, setServicos] = useState(servicosExemplo);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedServico, setSelectedServico] = useState<any>(null);
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

  const handleAddServico = () => {
    if (!novoServico.nome || !novoServico.duracao || !novoServico.valor) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const servico = {
      id: Date.now(),
      nome: novoServico.nome,
      descricao: novoServico.descricao,
      duracao: parseInt(novoServico.duracao),
      valor: parseFloat(novoServico.valor),
      profissional: novoServico.profissional || "Não definido",
      isPromocao: novoServico.isPromocao,
      valorPromocional: novoServico.valorPromocional ? parseFloat(novoServico.valorPromocional) : null,
      validadePromocao: novoServico.validadePromocao || null
    };

    setServicos([...servicos, servico]);
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
    
    toast({
      title: "Sucesso",
      description: "Serviço adicionado com sucesso!"
    });
  };

  const handleEditServico = (servico: any) => {
    setSelectedServico(servico);
    setEditingServico({
      nome: servico.nome,
      descricao: servico.descricao,
      duracao: servico.duracao.toString(),
      valor: servico.valor.toString(),
      profissional: servico.profissional,
      isPromocao: servico.isPromocao || false,
      valorPromocional: servico.valorPromocional ? servico.valorPromocional.toString() : "",
      validadePromocao: servico.validadePromocao || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingServico.nome || !editingServico.duracao || !editingServico.valor) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const updatedServico = {
      ...selectedServico,
      nome: editingServico.nome,
      descricao: editingServico.descricao,
      duracao: parseInt(editingServico.duracao),
      valor: parseFloat(editingServico.valor),
      profissional: editingServico.profissional || "Não definido",
      isPromocao: editingServico.isPromocao,
      valorPromocional: editingServico.valorPromocional ? parseFloat(editingServico.valorPromocional) : null,
      validadePromocao: editingServico.validadePromocao || null
    };

    setServicos(servicos.map(s => 
      s.id === selectedServico.id ? updatedServico : s
    ));
    
    setIsEditDialogOpen(false);
    setSelectedServico(null);
    
    toast({
      title: "Sucesso",
      description: "Serviço atualizado com sucesso!"
    });
  };

  const handleRemoveServico = (id: number) => {
    setServicos(servicos.filter(s => s.id !== id));
    toast({
      title: "Serviço removido",
      description: "O serviço foi removido da lista"
    });
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
        {servicos.length === 0 ? (
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
                  <CardTitle className="text-lg">{servico.nome}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {servico.descricao}
                    </p>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {servico.duracao} min
                        </Badge>
                        {servico.isPromocao && (
                          <Badge variant="default" className="bg-red-500 text-white">
                            <Tag className="h-3 w-3 mr-1" />
                            PROMOÇÃO
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        {servico.isPromocao && servico.valorPromocional ? (
                          <div className="flex flex-col items-end">
                            <span className="text-sm text-muted-foreground line-through">
                              R$ {servico.valor.toFixed(2)}
                            </span>
                            <span className="font-semibold text-lg text-red-600">
                              R$ {servico.valorPromocional.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="font-semibold text-lg">
                            R$ {servico.valor.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      Profissional: {servico.profissional}
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