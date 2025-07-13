import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calendar, Edit, History } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";

const Clientes = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [clientes, setClientes] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHistoricoDialogOpen, setIsHistoricoDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const [editingCliente, setEditingCliente] = useState({
    nome: "",
    telefone: "",
    email: ""
  });
  const [novoCliente, setNovoCliente] = useState({
    nome: "",
    telefone: "",
    email: ""
  });

  const handleNovoCliente = () => {
    if (!novoCliente.nome || !novoCliente.telefone) {
      toast({
        title: "Erro",
        description: "Nome e telefone são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const cliente = {
      id: Date.now(),
      nome: novoCliente.nome,
      telefone: novoCliente.telefone,
      email: novoCliente.email,
      ultimoAtendimento: new Date().toISOString().split('T')[0],
      totalAtendimentos: 0
    };

    setClientes([...clientes, cliente]);
    setNovoCliente({ nome: "", telefone: "", email: "" });
    setIsDialogOpen(false);
    
    toast({
      title: "Sucesso",
      description: "Cliente cadastrado com sucesso!"
    });
  };

  const handleVerHistorico = (cliente: any) => {
    setSelectedCliente(cliente);
    setIsHistoricoDialogOpen(true);
  };

  const handleEditarCliente = (cliente: any) => {
    setSelectedCliente(cliente);
    setEditingCliente({
      nome: cliente.nome,
      telefone: cliente.telefone,
      email: cliente.email
    });
    setIsEditDialogOpen(true);
  };

  const handleSalvarEdicao = () => {
    if (!editingCliente.nome || !editingCliente.telefone) {
      toast({
        title: "Erro",
        description: "Nome e telefone são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setClientes(clientes.map(cliente => 
      cliente.id === selectedCliente.id 
        ? { ...cliente, ...editingCliente }
        : cliente
    ));
    
    setIsEditDialogOpen(false);
    setSelectedCliente(null);
    
    toast({
      title: "Sucesso",
      description: "Cliente atualizado com sucesso!"
    });
  };

  const handleAgendar = (cliente: any) => {
    // Redirecionar para agenda com cliente pré-selecionado
    navigate('/dashboard/agenda', { 
      state: { 
        clientePreSelecionado: cliente 
      } 
    });
    
    toast({
      title: "Redirecionando",
      description: `Agendamento para ${cliente.nome}`
    });
  };
  
  const filteredClientes = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.telefone.includes(searchTerm) ||
    cliente.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>Novo Cliente</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome*</Label>
                  <Input
                    id="nome"
                    placeholder="Nome completo"
                    value={novoCliente.nome}
                    onChange={(e) => setNovoCliente({...novoCliente, nome: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone*</Label>
                  <Input
                    id="telefone"
                    placeholder="(11) 99999-9999"
                    value={novoCliente.telefone}
                    onChange={(e) => setNovoCliente({...novoCliente, telefone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="cliente@email.com"
                    value={novoCliente.email}
                    onChange={(e) => setNovoCliente({...novoCliente, email: e.target.value})}
                  />
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button onClick={handleNovoCliente} className="flex-1">
                    Cadastrar
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

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{clientes.length}</div>
              <p className="text-sm text-muted-foreground">Total de Clientes</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">0</div>
              <p className="text-sm text-muted-foreground">Novos este mês</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">0</div>
              <p className="text-sm text-muted-foreground">Atendimentos por cliente</p>
            </CardContent>
          </Card>
        </div>

        {/* Busca */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Buscar Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Buscar por nome, telefone ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </CardContent>
        </Card>

        {/* Lista de Clientes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Lista de Clientes ({filteredClientes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredClientes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Nenhum cliente cadastrado ainda.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Cadastre seus primeiros clientes para começar a gerenciar agendamentos.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredClientes.map((cliente) => (
                  <div
                    key={cliente.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{cliente.nome}</div>
                      <div className="text-sm text-muted-foreground">
                        {cliente.telefone} • {cliente.email}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Último atendimento: {new Date(cliente.ultimoAtendimento).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <Badge variant="secondary">
                        {cliente.totalAtendimentos} atendimentos
                      </Badge>
                      
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleVerHistorico(cliente)}
                        >
                          <History className="h-4 w-4 mr-2" />
                          Ver Histórico
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditarCliente(cliente)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleAgendar(cliente)}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Agendar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Histórico */}
        <Dialog open={isHistoricoDialogOpen} onOpenChange={setIsHistoricoDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Histórico de Atendimentos - {selectedCliente?.nome}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedCliente ? (
                <>
                  <div className="text-sm text-muted-foreground">
                    Cliente: <strong>{selectedCliente.nome}</strong>
                  </div>
                  <Separator />
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    <p className="text-muted-foreground">Nenhum histórico disponível.</p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Nenhum histórico encontrado para este cliente
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Edição */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Editar Cliente - {selectedCliente?.nome}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nome">Nome*</Label>
                <Input
                  id="edit-nome"
                  placeholder="Nome completo"
                  value={editingCliente.nome}
                  onChange={(e) => setEditingCliente({...editingCliente, nome: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-telefone">Telefone*</Label>
                <Input
                  id="edit-telefone"
                  placeholder="(11) 99999-9999"
                  value={editingCliente.telefone}
                  onChange={(e) => setEditingCliente({...editingCliente, telefone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">E-mail</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="cliente@email.com"
                  value={editingCliente.email}
                  onChange={(e) => setEditingCliente({...editingCliente, email: e.target.value})}
                />
              </div>
              <div className="flex space-x-2 pt-4">
                <Button onClick={handleSalvarEdicao} className="flex-1">
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
      </div>
    </DashboardLayout>
  );
};

export default Clientes;