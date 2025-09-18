import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  company_id: string;
}

interface Professional {
  id: string;
  name: string;
  specialty?: string;
  company_id: string;
  is_available: boolean;
}

export const useAgendamentos = () => {
  const [agendamentos, setAgendamentos] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [companyId, setCompanyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Usuário não autenticado');
        return;
      }

      // Get company ID
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (companyError || !company) {
        setError('Empresa não encontrada');
        return;
      }

      setCompanyId(company.id);

      // Load all data in parallel
      const [servicesData, professionalsData, clientsData, appointmentsData] = await Promise.all([
        supabase.from('services').select('*').eq('company_id', company.id),
        supabase.from('professionals').select('*').eq('company_id', company.id),
        supabase.from('clients').select('*'),
        supabase
          .from('appointments')
          .select('*, pix_payment_proof')
          .eq('company_id', company.id)
          .order('appointment_date', { ascending: true })
          .order('appointment_time', { ascending: true })
      ]);

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
      const enrichedAppointments = appointmentsData.data?.map(apt => {
        const client = clientsData.data?.find(c => c.id === apt.client_id);
        const service = servicesData.data?.find(s => s.id === apt.service_id);
        const professional = professionalsData.data?.find(p => p.id === apt.professional_id);

        return {
          ...apt,
          clients: client ? { name: client.name } : null,
          services: service ? { name: service.name } : null,
          professionals: professional ? { name: professional.name } : null,
        };
      }) || [];

      setAgendamentos(enrichedAppointments);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    agendamentos,
    clients,
    services,
    professionals,
    companyId,
    loading,
    error,
    refreshData: loadData
  };
};