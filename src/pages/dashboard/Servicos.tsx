import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";

const servicosExemplo = [
  {
    id: 1,
    nome: "Corte Masculino",
    descricao: "Corte moderno e estilizado",
    duracao: 30,
    valor: 25.00,
    profissional: "Pedro"
  },
  {
    id: 2,
    nome: "Barba",
    descricao: "Aparar e modelar barba",
    duracao: 20,
    valor: 15.00,
    profissional: "Pedro"
  },
  {
    id: 3,
    nome: "Corte + Barba",
    descricao: "Pacote completo",
    duracao: 45,
    valor: 35.00,
    profissional: "Pedro"
  },
];

const Servicos = () => {
  const [servicos, setServicos] = useState(servicosExemplo);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [novoServico, setNovoServico] = useState({
    nome: "",
    descricao: "",
    duracao: "",
    valor: "",
    profissional: ""
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
      profissional: novoServico.profissional || "Não definido"
    };

    setServicos([...servicos, servico]);
    setNovoServico({
      nome: "",
      descricao: "",
      duracao: "",
      valor: "",
      profissional: ""
    });
    setIsDialogOpen(false);
    
    toast({
      title: "Sucesso",
      description: "Serviço adicionado com sucesso!"
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
                      <Badge variant="secondary">
                        {servico.duracao} min
                      </Badge>
                      <span className="font-semibold text-lg">
                        R$ {servico.valor.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      Profissional: {servico.profissional}
                    </div>
                    
                    <div className="flex space-x-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1">
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