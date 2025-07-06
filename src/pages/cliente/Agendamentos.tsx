import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import ClientLayout from "@/components/client/ClientLayout";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, CheckCircle, XCircle, MapPin, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Agendamentos = () => {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAgendamentos();
  }, []);

  const fetchAgendamentos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get client ID first
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientError || !client) {
        console.log('No client found');
        setLoading(false);
        return;
      }

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          companies:company_id(name, address, number, neighborhood, phone),
          services:service_id(name, price),
          professionals:professional_id(name)
        `)
        .eq('client_id', client.id)
        .in('status', ['scheduled', 'confirmed'])
        .order('appointment_date', { ascending: true });

      if (error) throw error;
      setAgendamentos(appointments || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Erro ao carregar agendamentos",
        description: "Não foi possível carregar seus agendamentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAgendamento = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Agendamento cancelado",
        description: "Seu agendamento foi cancelado com sucesso.",
        variant: "destructive"
      });
      
      fetchAgendamentos();
    } catch (error) {
      toast({
        title: "Erro ao cancelar",
        description: "Não foi possível cancelar o agendamento.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmarPresenca = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Presença confirmada",
        description: "Sua presença foi confirmada com sucesso.",
      });
      
      fetchAgendamentos();
    } catch (error) {
      toast({
        title: "Erro ao confirmar",
        description: "Não foi possível confirmar a presença.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500";
      case "scheduled":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmado";
      case "scheduled":
        return "Pendente";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Meus Agendamentos</h1>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ClientLayout>
    );
  }

  const confirmedCount = agendamentos.filter(a => a.status === 'confirmed').length;
  const pendingCount = agendamentos.filter(a => a.status === 'scheduled').length;

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Meus Agendamentos</h1>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{agendamentos.length}</div>
              <p className="text-sm text-muted-foreground">Agendamentos Ativos</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{confirmedCount}</div>
              <p className="text-sm text-muted-foreground">Confirmados</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{pendingCount}</div>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Agendamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Próximos Agendamentos ({agendamentos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {agendamentos.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Você não tem agendamentos ativos
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Que tal agendar um novo serviço?
                </p>
                <Button className="mt-4" onClick={() => window.location.href = '/buscar-barbearias'}>
                  Buscar Barbearias
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {agendamentos.map((agendamento) => (
                  <div
                    key={agendamento.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{agendamento.companies?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {agendamento.services?.name} • R$ {(agendamento.total_price || agendamento.services?.price || 0).toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(agendamento.appointment_date).toLocaleDateString("pt-BR")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {agendamento.appointment_time}
                        </span>
                        {agendamento.companies?.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {agendamento.companies.phone}
                          </span>
                        )}
                      </div>
                      {agendamento.companies?.address && (
                        <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {agendamento.companies.address}, {agendamento.companies.number} - {agendamento.companies.neighborhood}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <Badge 
                        variant="secondary"
                        className={`${getStatusColor(agendamento.status)} text-white`}
                      >
                        {getStatusText(agendamento.status)}
                      </Badge>
                      
                      <div className="flex space-x-2">
                        {agendamento.status === 'scheduled' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleConfirmarPresenca(agendamento.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Confirmar Presença
                          </Button>
                        )}
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancelar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancelar Agendamento</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Não, manter</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleCancelAgendamento(agendamento.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Sim, cancelar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
};

export default Agendamentos;