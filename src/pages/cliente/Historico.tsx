import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Eye, Star } from "lucide-react";
import ClientLayout from "@/components/client/ClientLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ReviewSection } from "@/components/ReviewSection";
import { CalendarSync } from "@/components/CalendarSync";

const Historico = () => {
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchHistorico();
  }, []);

  const fetchHistorico = async () => {
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
          companies:company_id(name, address, number, neighborhood),
          services:service_id(name, price),
          professionals:professional_id(name)
        `)
        .eq('client_id', client.id)
        .order('appointment_date', { ascending: false });

      if (error) throw error;
      setHistorico(appointments || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar seu histórico de agendamentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      case "scheduled":
        return "bg-blue-500";
      case "confirmed":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Concluído";
      case "cancelled":
        return "Cancelado";
      case "scheduled":
        return "Agendado";
      case "confirmed":
        return "Confirmado";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Histórico de Agendamentos</h1>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
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

  const completedAppointments = historico.filter(h => h.status === 'completed');
  const totalSpent = completedAppointments.reduce((acc, h) => acc + (h.total_price || h.services?.price || 0), 0);

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Histórico de Atendimentos</h1>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{historico.length}</div>
              <p className="text-sm text-muted-foreground">Total de Agendamentos</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">
                {completedAppointments.length}
              </div>
              <p className="text-sm text-muted-foreground">Atendimentos Concluídos</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">
                R$ {totalSpent.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">Total Gasto</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista do Histórico */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Histórico Completo ({historico.length} atendimentos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historico.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Você ainda não possui histórico de agendamentos.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {historico.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{item.companies?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.services?.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(item.appointment_date).toLocaleDateString("pt-BR")} às {item.appointment_time}
                      </div>
                      {item.total_price && (
                        <div className="text-sm text-muted-foreground">
                          R$ {item.total_price.toFixed(2)} • {item.payment_method || 'N/A'}
                        </div>
                      )}
                      {item.companies?.address && (
                        <div className="text-sm text-muted-foreground">
                          {item.companies.address}, {item.companies.number} - {item.companies.neighborhood}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <Badge 
                        variant="secondary"
                        className={`${getStatusColor(item.status)} text-white`}
                      >
                        {getStatusText(item.status)}
                      </Badge>
                      
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                      
                      {item.status === 'completed' && (
                        <div className="space-y-2">
                          <CalendarSync appointment={item} />
                          <ReviewSection
                            companyId={item.company_id}
                            professionalId={item.professional_id}
                            appointmentId={item.id}
                            canReview={true}
                          />
                        </div>
                      )}
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

export default Historico;