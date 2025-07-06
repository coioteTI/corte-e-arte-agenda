import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Calendar, Clock, User, Phone, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

// Mock data para agendamento
const getBarbeariaAgendamento = (slug: string) => {
  const barbearias = {
    "barbearia-do-joao": {
      nome: "Barbearia do João",
      logo: logo,
      servicos: [
        { id: 1, nome: "Corte Masculino", duracao: 30, valor: 25.00 },
        { id: 2, nome: "Barba", duracao: 20, valor: 15.00 },
        { id: 3, nome: "Corte + Barba", duracao: 45, valor: 35.00 },
        { id: 4, nome: "Sobrancelha", duracao: 15, valor: 10.00 }
      ],
      horarios: [
        "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
        "11:00", "11:30", "14:00", "14:30", "15:00", "15:30",
        "16:00", "16:30", "17:00", "17:30"
      ]
    }
  };
  
  return barbearias[slug as keyof typeof barbearias] || barbearias["barbearia-do-joao"];
};

// Gerar próximos 14 dias úteis
const gerarProximosDias = () => {
  const dias = [];
  const hoje = new Date();
  
  for (let i = 1; i <= 14; i++) {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() + i);
    
    // Pular domingos (0)
    if (data.getDay() !== 0) {
      dias.push({
        data: data.toISOString().split('T')[0],
        texto: data.toLocaleDateString('pt-BR', { 
          weekday: 'long', 
          day: '2-digit', 
          month: '2-digit' 
        })
      });
    }
  }
  
  return dias;
};

const AgendarServico = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const barbearia = getBarbeariaAgendamento(slug || "barbearia-do-joao");
  const diasDisponiveis = gerarProximosDias();
  
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: "",
    servicoId: "",
    data: "",
    horario: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const servicoSelecionado = barbearia.servicos.find(s => s.id.toString() === formData.servicoId);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Validações
    if (!formData.nome || !formData.telefone || !formData.servicoId || !formData.data || !formData.horario) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Simular envio do agendamento
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Agendamento Enviado!",
        description: "A barbearia entrará em contato para confirmar seu horário.",
      });
      
      // Redirecionar para confirmação
      setTimeout(() => {
        navigate(`/agendamento-confirmado/${slug}`);
      }, 2000);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <img
                src={barbearia.logo}
                alt={barbearia.nome}
                className="h-16 w-16 rounded-full object-cover"
              />
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Agendar em {barbearia.nome}
                </h1>
                <p className="text-muted-foreground">
                  Preencha os dados para solicitar seu agendamento
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulário de Agendamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Dados do Agendamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados Pessoais */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Seus Dados
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome completo *</Label>
                  <Input
                    id="nome"
                    placeholder="Seu nome completo"
                    value={formData.nome}
                    onChange={(e) => handleInputChange("nome", e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telefone">WhatsApp *</Label>
                    <Input
                      id="telefone"
                      placeholder="(11) 99999-9999"
                      value={formData.telefone}
                      onChange={(e) => handleInputChange("telefone", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail (opcional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Serviço */}
              <div className="space-y-4">
                <h3 className="font-medium">Escolha o Serviço</h3>
                
                <div className="space-y-2">
                  <Label>Serviço *</Label>
                  <Select value={formData.servicoId} onValueChange={(value) => handleInputChange("servicoId", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {barbearia.servicos.map((servico) => (
                        <SelectItem key={servico.id} value={servico.id.toString()}>
                          {servico.nome} - R$ {servico.valor.toFixed(2)} ({servico.duracao} min)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {servicoSelecionado && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      <strong>{servicoSelecionado.nome}</strong><br />
                      Duração: {servicoSelecionado.duracao} minutos<br />
                      Valor: R$ {servicoSelecionado.valor.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              {/* Data e Horário */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Data e Horário
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Select value={formData.data} onValueChange={(value) => handleInputChange("data", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma data" />
                      </SelectTrigger>
                      <SelectContent>
                        {diasDisponiveis.map((dia) => (
                          <SelectItem key={dia.data} value={dia.data}>
                            {dia.texto}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Horário *</Label>
                    <Select value={formData.horario} onValueChange={(value) => handleInputChange("horario", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um horário" />
                      </SelectTrigger>
                      <SelectContent>
                        {barbearia.horarios.map((horario) => (
                          <SelectItem key={horario} value={horario}>
                            {horario}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Botão de Confirmação */}
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? "Enviando agendamento..." : "Confirmar Agendamento"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Importante:</strong> Este é um pré-agendamento. A barbearia entrará em contato 
              via WhatsApp para confirmar a disponibilidade do horário solicitado.
            </p>
          </CardContent>
        </Card>

        {/* Voltar */}
        <div className="text-center">
          <Link to={`/barbearia/${slug}`} className="text-muted-foreground hover:text-foreground">
            ← Voltar ao perfil da barbearia
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AgendarServico;