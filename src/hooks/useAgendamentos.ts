import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBranch } from '@/contexts/BranchContext';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  company_id: string;
  client_id: string;
  professional_id: string;
  service_id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  total_price?: number;
  payment_method?: string;
  notes?: string;
  pix_payment_proof?: string;
  branch_id?: string;
  created_at: string;
  updated_at: string;
  clients?: { name: string } | null;
  services?: { name: string } | null;
  professionals?: { name: string } | null;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  phone: string;
  user_id?: string;
  branch_id?: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  company_id: string;
  branch_id?: string;
}

interface Professional {
  id: string;
  name: string;
  specialty?: string;
  company_id: string;
  is_available: boolean;
  branch_id?: string;
}

// Timeout padrão de 15 segundos
const REQUEST_TIMEOUT = 15000;

export const useAgendamentos = () => {
  const [agendamentos, setAgendamentos] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastBranchId, setLastBranchId] = useState<string | null>(null);

  const { currentBranchId, userRole, companyId, loading: branchLoading } = useBranch();
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Usuário não autenticado');
        return;
      }

      // Use companyId from BranchContext - already resolved for both owners and employees
      if (!companyId) {
        setError('Empresa não encontrada. Verifique se você está associado a uma filial.');
        return;
      }

      // Build queries with optional branch filtering
      // CEO sees all branches, others see only their current branch
      const shouldFilterByBranch = userRole !== 'ceo' && currentBranchId;

      // Services query
      let servicesQuery = supabase.from('services').select('*').eq('company_id', companyId);
      if (shouldFilterByBranch) {
        servicesQuery = servicesQuery.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
      }

      // Professionals query
      let professionalsQuery = supabase.from('professionals').select('*').eq('company_id', companyId);
      if (shouldFilterByBranch) {
        professionalsQuery = professionalsQuery.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
      }

      // Clients query - filter by branch
      let clientsQuery = supabase.from('clients').select('*');
      if (shouldFilterByBranch) {
        clientsQuery = clientsQuery.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
      }

      // Appointments query
      let appointmentsQuery = supabase
        .from('appointments')
        .select('*, pix_payment_proof')
        .eq('company_id', companyId)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });
      
      if (shouldFilterByBranch) {
        appointmentsQuery = appointmentsQuery.or(`branch_id.eq.${currentBranchId},branch_id.is.null`);
      }

      // Timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Tempo limite excedido. Verifique sua conexão e tente novamente.')), REQUEST_TIMEOUT)
      );

      // Load all data in parallel with timeout
      const [servicesData, professionalsData, clientsData, appointmentsData] = await Promise.race([
        Promise.all([
          servicesQuery,
          professionalsQuery,
          clientsQuery,
          appointmentsQuery,
        ]),
        timeoutPromise
      ]) as any[];

      // Check for errors
      if (servicesData.error) throw servicesData.error;
      if (professionalsData.error) throw professionalsData.error;
      if (clientsData.error) throw clientsData.error;
      if (appointmentsData.error) throw appointmentsData.error;

      // Set basic data
      setServices(servicesData.data || []);
      setProfessionals(professionalsData.data || []);
      setClients(clientsData.data || []);

      // Enrich appointments with related data
      const enrichedAppointments = appointmentsData.data?.map((apt: any) => {
        const client = clientsData.data?.find((c: Client) => c.id === apt.client_id);
        const service = servicesData.data?.find((s: Service) => s.id === apt.service_id);
        const professional = professionalsData.data?.find((p: Professional) => p.id === apt.professional_id);

        return {
          ...apt,
          clients: client ? { name: client.name } : null,
          services: service ? { name: service.name } : null,
          professionals: professional ? { name: professional.name } : null,
        };
      }) || [];

      setAgendamentos(enrichedAppointments);
      setLastBranchId(currentBranchId);
    } catch (err) {
      // Don't show error for aborted requests
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados';
      console.error('Error loading data:', err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentBranchId, userRole, companyId]);

  // Clear and reload when branch changes
  useEffect(() => {
    if (branchLoading || !companyId) return;

    // Detect branch change and clear data before reloading
    if (lastBranchId !== currentBranchId) {
      // Clear all data to prevent data leakage
      setAgendamentos([]);
      setClients([]);
      setServices([]);
      setProfessionals([]);
      loadData();
    }
  }, [currentBranchId, branchLoading, lastBranchId, loadData, companyId]);

  // Initial load
  useEffect(() => {
    if (!branchLoading && companyId && lastBranchId === null) {
      loadData();
    }
  }, [branchLoading, lastBranchId, loadData, companyId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    agendamentos,
    clients,
    services,
    professionals,
    companyId,
    loading,
    error,
    refreshData: loadData,
    currentBranchId,
  };
};
