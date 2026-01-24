import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Edit, History, Zap, XCircle, AlertTriangle, Plus } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AdminPasswordModal } from "@/components/AdminPasswordModal";
import { useAdminPassword } from "@/hooks/useAdminPassword";
import { useBranch } from "@/contexts/BranchContext";

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface Professional {
  id: string;
  name: string;
  specialty: string | null;
}

const Clientes = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { hasAdminPassword } = useAdminPassword();
  const { currentBranchId, userRole } = useBranch();
  const [searchTerm, setSearchTerm] = useState("");
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHistoricoDialogOpen, setIsHistoricoDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const [clientHistory, setClientHistory] = useState<any[]>([]);
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

  // Quick Service state
  const [isQuickServiceOpen, setIsQuickServiceOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
  const [quickServiceLoading, setQuickServiceLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [avulsoCounter, setAvulsoCounter] = useState(0);
  const [finishAsPaid, setFinishAsPaid] = useState(true);

  // Admin password protection state
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'edit' | 'cancel_service' | 'add_service';
    data?: any;
  } | null>(null);
  const [hasAdminPasswordConfigured, setHasAdminPasswordConfigured] = useState(false);

  // Cancel service state
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<any>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Add service to existing appointment state
  const [isAddServiceDialogOpen, setIsAddServiceDialogOpen] = useState(false);
  const [appointmentToAddService, setAppointmentToAddService] = useState<any>(null);
  const [addServiceIds, setAddServiceIds] = useState<string[]>([]);
  const [addServiceLoading, setAddServiceLoading] = useState(false);

  // Should filter by branch - CEO sees all, others see only their branch
  const shouldFilterByBranch = userRole !== 'ceo' && currentBranchId;

  useEffect(() => {
    loadClientes();
  }, [currentBranchId, userRole]);

  useEffect(() => {
    // Check if admin password is configured
    const checkAdminPassword = async () => {
      if (companyId) {
        const hasPassword = await hasAdminPassword(companyId);
        setHasAdminPasswordConfigured(hasPassword);
      }
    };
    checkAdminPassword();
  }, [companyId, hasAdminPassword]);

  const loadClientes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get company ID first
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!company) return;
      setCompanyId(company.id);

      // Build base queries with branch filtering
      let appointmentsQuery = supabase
        .from('appointments')
        .select('client_id')
        .eq('company_id', company.id);
      
      let servicesQuery = supabase
        .from('services')
        .select('id, name, price, duration')
        .eq('company_id', company.id)
        .order('name');
      
      let professionalsQuery = supabase
        .from('professionals')
        .select('id, name, specialty')
        .eq('company_id', company.id)
        .eq('is_available', true)
        .order('name');

      // Apply branch filter if not CEO
      if (shouldFilterByBranch) {
        appointmentsQuery = appointmentsQuery.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
        servicesQuery = servicesQuery.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
        professionalsQuery = professionalsQuery.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
      }

      // Load data in parallel
      const [appointmentsRes, servicesRes, professionalsRes, avulsoCountRes] = await Promise.all([
        appointmentsQuery,
        servicesQuery,
        professionalsQuery,
        supabase
          .from('clients')
          .select('id', { count: 'exact' })
          .like('name', 'Cliente %')
      ]);

      // Set avulso counter
      setAvulsoCounter(avulsoCountRes.count || 0);

      // Set services and professionals
      if (servicesRes.data) setServices(servicesRes.data);
      if (professionalsRes.data) setProfessionals(professionalsRes.data);

      if (!appointmentsRes.data || appointmentsRes.data.length === 0) {
        setClientes([]);
        return;
      }

      // Get unique client IDs
      const clientIds = [...new Set(appointmentsRes.data.map(a => a.client_id).filter(Boolean))];

      if (clientIds.length > 0) {
        // Fetch all clients that have appointments with this company
        const { data: clientsData } = await supabase
          .from('clients')
          .select('*')
          .in('id', clientIds)
          .order('created_at', { ascending: false });

        setClientes(clientsData || []);
      } else {
        setClientes([]);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNovoCliente = async () => {
    if (!novoCliente.nome || !novoCliente.telefone) {
      toast({
        title: "Erro",
        description: "Nome e telefone são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Adding client');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para cadastrar clientes",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('clients')
        .insert({
          name: novoCliente.nome,
          phone: novoCliente.telefone,
          email: novoCliente.email,
          user_id: user.id
        });

      if (error) throw error;

      setNovoCliente({ nome: "", telefone: "", email: "" });
      setIsDialogOpen(false);
      
      loadClientes();
      
      toast({
        title: "Cliente cadastrado com sucesso!",
        description: "O cliente foi adicionado à sua lista."
      });
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível cadastrar o cliente.",
        variant: "destructive"
      });
    }
  };

  const handleVerHistorico = async (cliente: any) => {
    setSelectedCliente(cliente);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!company) return;

      const { data: historyData } = await supabase
        .from('appointments')
        .select(`
          *,
          services(name, price, duration),
          professionals(name)
        `)
        .eq('company_id', company.id)
        .eq('client_id', cliente.id)
        .order('appointment_date', { ascending: false });

      setClientHistory(historyData || []);
    } catch (error) {
      console.error('Error loading client history:', error);
    }
    
    setIsHistoricoDialogOpen(true);
  };

  // Protected edit action - requires admin password
  const handleEditarCliente = (cliente: any) => {
    if (hasAdminPasswordConfigured) {
      setPendingAction({ type: 'edit', data: cliente });
      setShowAdminPasswordModal(true);
    } else {
      // No password configured, proceed directly
      proceedWithEdit(cliente);
    }
  };

  const proceedWithEdit = (cliente: any) => {
    setSelectedCliente(cliente);
    setEditingCliente({
      nome: cliente.name,
      telefone: cliente.phone,
      email: cliente.email
    });
    setIsEditDialogOpen(true);
  };

  // Protected cancel service action - requires admin password
  const handleCancelService = (appointment: any) => {
    if (hasAdminPasswordConfigured) {
      setPendingAction({ type: 'cancel_service', data: appointment });
      setShowAdminPasswordModal(true);
    } else {
      // No password configured, proceed directly
      proceedWithCancelService(appointment);
    }
  };

  const proceedWithCancelService = (appointment: any) => {
    setAppointmentToCancel(appointment);
    setIsCancelDialogOpen(true);
  };

  const confirmCancelService = async () => {
    if (!appointmentToCancel) return;

    setCancelLoading(true);
    try {
      // Update appointment status to 'cancelled' and set financial values to 0
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          payment_status: 'cancelled',
          total_price: 0 // Set to 0 so it doesn't count in financial reports
        })
        .eq('id', appointmentToCancel.id);

      if (error) throw error;

      toast({
        title: "Serviço cancelado",
        description: "O atendimento foi cancelado e não será contabilizado nos relatórios financeiros."
      });

      // Reload client history
      if (selectedCliente) {
        await handleVerHistorico(selectedCliente);
      }

      setIsCancelDialogOpen(false);
      setAppointmentToCancel(null);
    } catch (error) {
      console.error('Error cancelling service:', error);
      toast({
        title: "Erro ao cancelar",
        description: "Não foi possível cancelar o serviço.",
        variant: "destructive"
      });
    } finally {
      setCancelLoading(false);
    }
  };

  // Handle admin password success
  const handleAdminPasswordSuccess = () => {
    if (pendingAction?.type === 'edit' && pendingAction.data) {
      proceedWithEdit(pendingAction.data);
    } else if (pendingAction?.type === 'cancel_service' && pendingAction.data) {
      proceedWithCancelService(pendingAction.data);
    } else if (pendingAction?.type === 'add_service' && pendingAction.data) {
      proceedWithAddService(pendingAction.data);
    }
    setPendingAction(null);
  };

  // Protected add service action - requires admin password
  const handleAddService = (appointment: any) => {
    if (hasAdminPasswordConfigured) {
      setPendingAction({ type: 'add_service', data: appointment });
      setShowAdminPasswordModal(true);
    } else {
      // No password configured, proceed directly
      proceedWithAddService(appointment);
    }
  };

  const proceedWithAddService = (appointment: any) => {
    setAppointmentToAddService(appointment);
    setAddServiceIds([]);
    setIsAddServiceDialogOpen(true);
  };

  const toggleAddServiceSelection = (serviceId: string) => {
    setAddServiceIds(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const addServicesToAppointment = async () => {
    if (!appointmentToAddService || addServiceIds.length === 0 || !companyId) return;

    setAddServiceLoading(true);
    try {
      const today = new Date();
      let cumulativeMinutes = 0;

      // Create new appointments for the additional services
      const newAppointments = addServiceIds.map((serviceId) => {
        const service = services.find(s => s.id === serviceId);
        
        const appointmentTime = new Date(today.getTime() + cumulativeMinutes * 60000);
        const timeString = appointmentTime.toTimeString().slice(0, 5);
        
        cumulativeMinutes += (service?.duration || 30);
        
        return {
          company_id: companyId,
          client_id: appointmentToAddService.client_id,
          service_id: serviceId,
          professional_id: appointmentToAddService.professional_id,
          appointment_date: appointmentToAddService.appointment_date,
          appointment_time: timeString,
          status: 'completed',
          payment_status: 'paid',
          payment_method: appointmentToAddService.payment_method || 'no_local',
          total_price: service?.price || 0
        };
      });

      const { error } = await supabase
        .from('appointments')
        .insert(newAppointments);

      if (error) throw error;

      const addedServices = services.filter(s => addServiceIds.includes(s.id));
      const totalAdded = addedServices.reduce((sum, s) => sum + s.price, 0);
      const serviceNames = addedServices.map(s => s.name).join(', ');

      toast({
        title: "Serviço(s) adicionado(s)!",
        description: `${serviceNames} - R$ ${totalAdded.toFixed(2)} adicionado ao atendimento.`
      });

      setIsAddServiceDialogOpen(false);
      setAppointmentToAddService(null);
      setAddServiceIds([]);

      // Reload client history
      if (selectedCliente) {
        await handleVerHistorico(selectedCliente);
      }
    } catch (error) {
      console.error('Error adding services:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar os serviços",
        variant: "destructive"
      });
    } finally {
      setAddServiceLoading(false);
    }
  };

  const addServiceTotal = services
    .filter(s => addServiceIds.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0);

  const handleSalvarEdicao = async () => {
    if (!editingCliente.nome || !editingCliente.telefone) {
      toast({
        title: "Erro",
        description: "Nome e telefone são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: editingCliente.nome,
          phone: editingCliente.telefone,
          email: editingCliente.email
        })
        .eq('id', selectedCliente.id);

      if (error) throw error;
      
      setIsEditDialogOpen(false);
      setSelectedCliente(null);
      
      loadClientes();
      
      toast({
        title: "Cliente atualizado com sucesso!",
        description: "As alterações foram salvas."
      });
    } catch (error) {
      console.error('Error updating client:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar o cliente.",
        variant: "destructive"
      });
    }
  };

  const handleAgendar = (cliente: any) => {
    navigate('/dashboard/agenda', { 
      state: { 
        clientePreSelecionado: cliente 
      } 
    });
    
    toast({
      title: "Redirecionando",
      description: `Agendamento para ${cliente.name}`
    });
  };
  
  const selectedServices = services.filter(s => selectedServiceIds.includes(s.id));
  const totalServicesPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalServicesDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);

  const handleQuickService = async () => {
    if (selectedServiceIds.length === 0 || !selectedProfessionalId || !companyId) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um serviço e o profissional",
        variant: "destructive"
      });
      return;
    }

    // Prevent double-click
    if (quickServiceLoading) return;
    
    setQuickServiceLoading(true);
    
    // Capture values before resetting state for immediate UI feedback
    const serviceIdsToProcess = [...selectedServiceIds];
    const professionalIdToProcess = selectedProfessionalId;
    const shouldMarkAsPaid = finishAsPaid;
    const servicesToProcess = serviceIdsToProcess.map(id => services.find(s => s.id === id)).filter(Boolean) as Service[];
    const totalPrice = servicesToProcess.reduce((sum, s) => sum + (s?.price || 0), 0);
    const serviceNames = servicesToProcess.map(s => s.name).join(', ');
    
    // Reset form immediately for instant next use
    setSelectedServiceIds([]);
    setSelectedProfessionalId("");
    setFinishAsPaid(true);
    setIsQuickServiceOpen(false);
    
    try {
      const nextNumber = avulsoCounter + 1;
      setAvulsoCounter(nextNumber); // Update counter immediately
      
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          name: `Cliente ${nextNumber}`,
          phone: 'Avulso'
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // Add new client to local state immediately (no full reload needed)
      setClientes(prev => [newClient, ...prev]);

      const today = new Date();
      let cumulativeMinutes = 0;
      const appointments = serviceIdsToProcess.map((serviceId) => {
        const service = servicesToProcess.find(s => s.id === serviceId);
        
        const appointmentTime = new Date(today.getTime() + cumulativeMinutes * 60000);
        const timeString = appointmentTime.toTimeString().slice(0, 5);
        
        cumulativeMinutes += (service?.duration || 30);
        
        // Use local date format to avoid timezone issues (YYYY-MM-DD)
        const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        return {
          company_id: companyId,
          client_id: newClient.id,
          service_id: serviceId,
          professional_id: professionalIdToProcess,
          appointment_date: localDate,
          appointment_time: timeString,
          status: 'completed',
          payment_status: shouldMarkAsPaid ? 'paid' : 'pending',
          payment_method: 'no_local',
          total_price: service?.price || 0,
          // When marked as paid, set confirmation date for payment history
          ...(shouldMarkAsPaid && { payment_confirmation_date: new Date().toISOString() })
        };
      });

      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert(appointments);

      if (appointmentError) throw appointmentError;

      const paymentStatus = shouldMarkAsPaid ? 'Pago' : 'Pendente';
      toast({
        title: "Serviço(s) finalizado(s)!",
        description: `${serviceNames} - R$ ${totalPrice.toFixed(2)} (${paymentStatus})`
      });
    } catch (error) {
      console.error('Error creating quick service:', error);
      toast({
        title: "Erro",
        description: "Não foi possível finalizar o serviço. Tente novamente.",
        variant: "destructive"
      });
      // On error, the modal is already closed but user can open again immediately
    } finally {
      setQuickServiceLoading(false);
    }
  };

  const toggleServiceSelection = (serviceId: string) => {
    setSelectedServiceIds(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const filteredClientes = clientes.filter(cliente =>
    cliente.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.phone.includes(searchTerm) ||
    cliente.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Concluído</Badge>;
      case 'confirmed':
        return <Badge variant="secondary">Confirmado</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      case 'scheduled':
        return <Badge variant="outline">Agendado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (paymentStatus: string | null, status: string) => {
    // If cancelled, don't show payment status
    if (status === 'cancelled') return null;
    
    switch (paymentStatus) {
      case 'paid':
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">Pago</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Pendente</Badge>;
      case 'awaiting_payment':
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Aguardando</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{paymentStatus || 'N/A'}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between px-2 sm:px-0">
          <h1 className="text-xl sm:text-2xl font-semibold">Clientes</h1>
          <div className="flex gap-2">
            <Dialog open={isQuickServiceOpen} onOpenChange={(open) => {
              setIsQuickServiceOpen(open);
              if (!open) {
                setSelectedServiceIds([]);
                setSelectedProfessionalId("");
                setFinishAsPaid(true);
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary" className="text-xs sm:text-sm">
                  <Zap className="h-3 w-3 mr-1" />
                  Serviço Rápido
                </Button>
              </DialogTrigger>
              <DialogContent onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Serviço Rápido
                  </DialogTitle>
                  <DialogDescription>
                    Selecione um ou mais serviços para registrar.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Serviços* (selecione um ou mais)</Label>
                    <div className="border rounded-lg max-h-48 overflow-y-auto">
                      {services.map((service) => (
                        <div 
                          key={service.id}
                          onClick={() => toggleServiceSelection(service.id)}
                          className={`flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${
                            selectedServiceIds.includes(service.id) ? 'bg-primary/10' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                              selectedServiceIds.includes(service.id) ? 'bg-primary border-primary' : 'border-muted-foreground'
                            }`}>
                              {selectedServiceIds.includes(service.id) && (
                                <span className="text-primary-foreground text-xs">✓</span>
                              )}
                            </div>
                            <span className="text-sm">{service.name}</span>
                          </div>
                          <span className="text-sm font-medium">R$ {service.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    {selectedServiceIds.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {selectedServiceIds.length} serviço(s) selecionado(s)
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Profissional*</Label>
                    <Select value={selectedProfessionalId} onValueChange={setSelectedProfessionalId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o profissional" />
                      </SelectTrigger>
                      <SelectContent className="z-[100] bg-background border">
                        {professionals.map((prof) => (
                          <SelectItem key={prof.id} value={prof.id}>
                            {prof.name} {prof.specialty ? `(${prof.specialty})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedServices.length > 0 && (
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">
                        {selectedServices.length === 1 ? 'Valor do serviço:' : 'Valor total:'}
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        R$ {totalServicesPrice.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Duração total: {totalServicesDuration} minutos
                      </div>
                      {selectedServices.length > 1 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {selectedServices.map(s => s.name).join(' + ')}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg border">
                    <Checkbox
                      id="finishAsPaid"
                      checked={finishAsPaid}
                      onCheckedChange={(checked) => setFinishAsPaid(checked === true)}
                    />
                    <label
                      htmlFor="finishAsPaid"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      Finalizar serviço como pago
                    </label>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${finishAsPaid ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                      {finishAsPaid ? 'Pago' : 'Pendente'}
                    </span>
                  </div>

                  <Button 
                    onClick={handleQuickService} 
                    className="w-full"
                    disabled={selectedServiceIds.length === 0 || !selectedProfessionalId || quickServiceLoading}
                  >
                    {quickServiceLoading ? "Finalizando..." : `Finalizar ${finishAsPaid ? 'como Pago' : 'como Pendente'}`}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs sm:text-sm">Novo Cliente</Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Cliente</DialogTitle>
                <DialogDescription>
                  Preencha os dados do cliente para cadastrá-lo no sistema.
                </DialogDescription>
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
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3 px-2 sm:px-0">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="text-lg sm:text-2xl font-bold">{clientes.length}</div>
              <p className="text-xs sm:text-sm text-muted-foreground">Total de Clientes</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="text-lg sm:text-2xl font-bold">0</div>
              <p className="text-xs sm:text-sm text-muted-foreground">Novos este mês</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="text-lg sm:text-2xl font-bold">0</div>
              <p className="text-xs sm:text-sm text-muted-foreground">Atendimentos por cliente</p>
            </CardContent>
          </Card>
        </div>

        {/* Busca */}
        <div className="mx-2 sm:mx-0">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Buscar Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Buscar por nome, telefone ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md text-sm"
              />
            </CardContent>
          </Card>
        </div>

        {/* Lista de Clientes */}
        <div className="mx-2 sm:mx-0">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">
                Lista de Clientes ({filteredClientes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-muted-foreground text-sm">Carregando clientes...</p>
                </div>
              ) : filteredClientes.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Nenhum cliente cadastrado ainda.
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                    Cadastre seus primeiros clientes para começar a gerenciar agendamentos.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {filteredClientes.map((cliente) => (
                     <div
                       key={cliente.id}
                       className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 space-y-3 sm:space-y-0"
                     >
                       <div className="flex-1 min-w-0">
                         <div className="font-medium text-sm sm:text-base">{cliente.name}</div>
                         <div className="text-xs sm:text-sm text-muted-foreground break-all">
                           {cliente.phone && 
                            cliente.phone !== '0000000000' && 
                            cliente.phone !== 'Avulso' && 
                            cliente.phone.trim() !== '' ? (
                             <>{cliente.phone}{cliente.email && ` • ${cliente.email}`}</>
                           ) : (
                             cliente.email || 'Cliente avulso'
                           )}
                         </div>
                         <div className="text-xs sm:text-sm text-muted-foreground">
                           Cadastrado em: {new Date(cliente.created_at).toLocaleDateString("pt-BR")}
                         </div>
                       </div>
                       
                       <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                         <Badge variant="secondary" className="text-xs">
                           Cliente ativo
                         </Badge>
                         
                         <div className="flex flex-wrap gap-2">
                           <Button 
                             size="sm" 
                             variant="outline"
                             onClick={() => handleVerHistorico(cliente)}
                             className="text-xs h-8"
                           >
                             <History className="h-3 w-3 mr-1" />
                             Histórico
                           </Button>
                           <Button 
                             size="sm" 
                             variant="outline"
                             onClick={() => handleEditarCliente(cliente)}
                             className="text-xs h-8"
                           >
                             <Edit className="h-3 w-3 mr-1" />
                             Editar
                           </Button>
                           <Button 
                             size="sm"
                             onClick={() => handleAgendar(cliente)}
                             className="text-xs h-8"
                           >
                             <Calendar className="h-3 w-3 mr-1" />
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
        </div>

        {/* Modal de Histórico with Cancel Service option */}
        <Dialog open={isHistoricoDialogOpen} onOpenChange={setIsHistoricoDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Histórico de Atendimentos - {selectedCliente?.name}
              </DialogTitle>
              <DialogDescription>
                Visualize o histórico completo de atendimentos deste cliente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedCliente ? (
              <>
                <div className="text-sm text-muted-foreground">
                  Cliente: <strong>{selectedCliente.name}</strong>
                </div>
                <Separator />
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {clientHistory.length === 0 ? (
                    <p className="text-muted-foreground">Nenhum histórico disponível.</p>
                  ) : (
                    clientHistory.map((appointment) => (
                      <div key={appointment.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">{appointment.services?.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Profissional: {appointment.professionals?.name || 'Não informado'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap justify-end">
                            {getStatusBadge(appointment.status)}
                            {getPaymentStatusBadge(appointment.payment_status, appointment.status)}
                            {/* Show add service button for non-cancelled appointments */}
                            {appointment.status !== 'cancelled' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => handleAddService(appointment)}
                                title="Adicionar serviço"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                            {/* Show cancel button only for non-cancelled appointments */}
                            {appointment.status !== 'cancelled' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleCancelService(appointment)}
                                title="Cancelar serviço"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Data: {new Date(appointment.appointment_date).toLocaleDateString('pt-BR')}</p>
                          <p>Horário: {appointment.appointment_time?.slice(0, 5)}</p>
                          <p>Duração: {appointment.services?.duration || 30} minutos</p>
                          <p>Valor: {appointment.status === 'cancelled' ? (
                            <span className="text-destructive line-through">R$ {appointment.services?.price?.toFixed(2) || '0,00'}</span>
                          ) : (
                            `R$ ${appointment.total_price?.toFixed(2) || appointment.services?.price?.toFixed(2) || '0,00'}`
                          )}</p>
                          {appointment.notes && (
                            <p>Observações: {appointment.notes}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
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
                Editar Cliente - {selectedCliente?.name}
              </DialogTitle>
              <DialogDescription>
                Atualize as informações do cliente.
              </DialogDescription>
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

        {/* Modal de Confirmação de Cancelamento */}
        <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Cancelar Serviço
              </DialogTitle>
              <DialogDescription>
                Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-sm font-medium mb-2">
                  Você está prestes a cancelar o seguinte atendimento:
                </p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Serviço:</strong> {appointmentToCancel?.services?.name}</p>
                  <p><strong>Data:</strong> {appointmentToCancel?.appointment_date ? new Date(appointmentToCancel.appointment_date).toLocaleDateString('pt-BR') : ''}</p>
                  <p><strong>Profissional:</strong> {appointmentToCancel?.professionals?.name}</p>
                  <p><strong>Valor:</strong> R$ {appointmentToCancel?.total_price?.toFixed(2) || appointmentToCancel?.services?.price?.toFixed(2) || '0,00'}</p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>⚠️ Ao cancelar este serviço:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>O atendimento será marcado como "Cancelado"</li>
                  <li>Não será contabilizado no faturamento</li>
                  <li>Não afetará comissões de profissionais</li>
                  <li>Ficará registrado apenas para controle interno</li>
                </ul>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCancelDialogOpen(false);
                  setAppointmentToCancel(null);
                }}
              >
                Voltar
              </Button>
              <Button 
                variant="destructive"
                onClick={confirmCancelService}
                disabled={cancelLoading}
              >
                {cancelLoading ? "Cancelando..." : "Confirmar Cancelamento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Adicionar Serviço */}
        <Dialog open={isAddServiceDialogOpen} onOpenChange={(open) => {
          setIsAddServiceDialogOpen(open);
          if (!open) {
            setAddServiceIds([]);
            setAppointmentToAddService(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Adicionar Serviços
              </DialogTitle>
              <DialogDescription>
                Selecione os serviços adicionais para incluir neste atendimento.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {appointmentToAddService && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p><strong>Atendimento original:</strong> {appointmentToAddService.services?.name}</p>
                  <p><strong>Data:</strong> {new Date(appointmentToAddService.appointment_date).toLocaleDateString('pt-BR')}</p>
                  <p><strong>Profissional:</strong> {appointmentToAddService.professionals?.name}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Selecione os serviços adicionais:</Label>
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {services.map((service) => (
                    <div 
                      key={service.id}
                      onClick={() => toggleAddServiceSelection(service.id)}
                      className={`flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${
                        addServiceIds.includes(service.id) ? 'bg-primary/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                          addServiceIds.includes(service.id) ? 'bg-primary border-primary' : 'border-muted-foreground'
                        }`}>
                          {addServiceIds.includes(service.id) && (
                            <span className="text-primary-foreground text-xs">✓</span>
                          )}
                        </div>
                        <span className="text-sm">{service.name}</span>
                      </div>
                      <span className="text-sm font-medium">R$ {service.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {addServiceIds.length > 0 && (
                <div className="p-4 bg-primary/10 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">
                    Total a adicionar:
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    R$ {addServiceTotal.toFixed(2)}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {services.filter(s => addServiceIds.includes(s.id)).map(s => s.name).join(' + ')}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddServiceDialogOpen(false);
                  setAddServiceIds([]);
                  setAppointmentToAddService(null);
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={addServicesToAppointment}
                disabled={addServiceIds.length === 0 || addServiceLoading}
              >
                {addServiceLoading ? "Adicionando..." : "Adicionar Serviços"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Admin Password Modal */}
        {companyId && (
          <AdminPasswordModal
            open={showAdminPasswordModal}
            onOpenChange={(open) => {
              setShowAdminPasswordModal(open);
              if (!open) {
                setPendingAction(null);
              }
            }}
            companyId={companyId}
            onSuccess={handleAdminPasswordSuccess}
            actionDescription={
              pendingAction?.type === 'edit' 
                ? 'editar as informações do cliente' 
                : pendingAction?.type === 'cancel_service'
                ? 'cancelar este serviço'
                : pendingAction?.type === 'add_service'
                ? 'adicionar serviços ao atendimento'
                : 'realizar esta ação'
            }
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Clientes;