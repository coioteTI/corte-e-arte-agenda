import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, User, Scissors, Clock, CreditCard, MapPin } from "lucide-react";

interface ServicoFinalizado {
  id: string;
  appointment_date: string;
  appointment_time: string;
  client_name: string;
  service_name: string;
  professional_name: string;
  payment_method: string;
  payment_status: string;
  total_price: number;
  created_at: string;
}

export default function HistoricoSimples() {
  const [servicos, setServicos] = useState<ServicoFinalizado[]>([]);
  const [servicosFiltrados, setServicosFiltrados] = useState<ServicoFinalizado[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>("");

  // Filtros
  const [filtroData, setFiltroData] = useState("");
  const [filtroProfissional, setFiltroProfissional] = useState("todos");
  const [filtroStatusPagamento, setFiltroStatusPagamento] = useState("todos");

  useEffect(() => {
    carregarServicosFinalizados();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [servicos, filtroData, filtroProfissional, filtroStatusPagamento]);

  const carregarServicosFinalizados = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (companyError) throw companyError;
      if (!companies) {
        toast.error("Empresa não encontrada");
        return;
      }

      setCompanyId(companies.id);

      // Buscar apenas appointments com status 'completed'
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          payment_method,
          payment_status,
          total_price,
          created_at,
          clients!inner(name),
          services!inner(name),
          professionals!inner(name)
        `)
        .eq('company_id', companies.id)
        .eq('status', 'completed')
        .order('appointment_date', { ascending: false });

      if (appointmentsError) throw appointmentsError;

      const servicosFormatados = appointmentsData?.map(apt => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        client_name: apt.clients.name,
        service_name: apt.services.name,
        professional_name: apt.professionals.name,
        payment_method: apt.payment_method,
        payment_status: apt.payment_status,
        total_price: apt.total_price,
        created_at: apt.created_at
      })) || [];

      setServicos(servicosFormatados);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      toast.error("Erro ao carregar histórico de serviços");
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let servicosFiltrados = [...servicos];

    // Filtro por data
    if (filtroData) {
      servicosFiltrados = servicosFiltrados.filter(servico =>
        servico.appointment_date === filtroData
      );
    }

    // Filtro por profissional
    if (filtroProfissional !== "todos") {
      servicosFiltrados = servicosFiltrados.filter(servico =>
        servico.professional_name.toLowerCase().includes(filtroProfissional.toLowerCase())
      );
    }

    // Filtro por status de pagamento
    if (filtroStatusPagamento !== "todos") {
      servicosFiltrados = servicosFiltrados.filter(servico =>
        servico.payment_status === filtroStatusPagamento
      );
    }

    setServicosFiltrados(servicosFiltrados);
  };

  const limparFiltros = () => {
    setFiltroData("");
    setFiltroProfissional("todos");
    setFiltroStatusPagamento("todos");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-500">Pago</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'awaiting_payment':
        return <Badge variant="outline">Aguardando</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'pix':
        return 'PIX';
      case 'no_local':
        return 'Pagamento Local';
      default:
        return method;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando histórico...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold">Histórico de Serviços</h1>
          <Badge variant="outline" className="text-sm">
            {servicosFiltrados.length} serviço(s) finalizado(s)
          </Badge>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                type="date"
                placeholder="Filtrar por data"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
              />
              
              <Input
                placeholder="Filtrar por profissional"
                value={filtroProfissional === "todos" ? "" : filtroProfissional}
                onChange={(e) => setFiltroProfissional(e.target.value || "todos")}
              />
              
              <Select value={filtroStatusPagamento} onValueChange={setFiltroStatusPagamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Status do pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="awaiting_payment">Aguardando</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={limparFiltros}>
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de serviços */}
        <div className="grid gap-4">
          {servicosFiltrados.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Scissors className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum serviço finalizado</h3>
                <p className="text-muted-foreground">
                  {servicos.length === 0 
                    ? "Ainda não há serviços finalizados para mostrar."
                    : "Nenhum serviço encontrado com os filtros aplicados."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            servicosFiltrados.map((servico) => (
              <Card key={servico.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-medium">{servico.client_name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Scissors className="h-4 w-4 text-muted-foreground" />
                        <span>{servico.service_name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Profissional: {servico.professional_name}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(servico.appointment_date), "dd/MM/yyyy", { locale: ptBR })} às {servico.appointment_time}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <div className="font-bold text-lg">
                          R$ {servico.total_price?.toFixed(2) || '0.00'}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <CreditCard className="h-3 w-3" />
                          {getPaymentMethodText(servico.payment_method)}
                        </div>
                      </div>
                      
                      {getStatusBadge(servico.payment_status)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}