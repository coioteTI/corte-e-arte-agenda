import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, addMinutes, isSameDay, parseISO } from 'date-fns';

type Appointment = {
  id: string;
  professional_id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  service_id?: string;
};

type Service = {
  id: string;
  name: string;
  duration: number;
  price: number;
};

type Professional = {
  id: string;
  name: string;
  is_available: boolean;
};

type TimeSlot = {
  time: string;
  isAvailable: boolean;
  conflictReason?: string;
  professionalName?: string;
};

export const useAvailability = (
  companyId: string | undefined,
  selectedDate: Date | undefined,
  selectedServiceId: string | undefined,
  professionals: Professional[],
  services: Service[]
) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  // Buscar agendamentos quando mudar a data ou empresa
  useEffect(() => {
    if (!companyId || !selectedDate) {
      setAppointments([]);
      return;
    }

    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('company_id', companyId)
          .eq('appointment_date', dateStr)
          .in('status', ['confirmed', 'scheduled', 'pending']);

        if (error) throw error;
        
        console.log('📅 Agendamentos para', dateStr, ':', data?.length || 0);
        setAppointments(data || []);
      } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [companyId, selectedDate]);

  // Gerar horários disponíveis baseado no horário de funcionamento
  const generateTimeSlots = (businessHours: any, selectedDate: Date): string[] => {
    if (!businessHours || !selectedDate) return [];

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[selectedDate.getDay()];
    const daySchedule = businessHours[dayName];

    if (!daySchedule?.isOpen) return [];

    const slots: string[] = [];
    const [startHour, startMinute] = daySchedule.start.split(':').map(Number);
    const [endHour, endMinute] = daySchedule.end.split(':').map(Number);

    // Gerar slots de 15 minutos para mais flexibilidade
    let currentTime = new Date();
    currentTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date();
    endTime.setHours(endHour, endMinute, 0, 0);

    while (currentTime < endTime) {
      const timeStr = format(currentTime, 'HH:mm');
      slots.push(timeStr);
      currentTime = addMinutes(currentTime, 15); // Intervalos de 15 minutos
    }

    return slots;
  };

  // Verificar se um horário está disponível considerando duração do serviço
  const isTimeSlotAvailable = (
    time: string, 
    professionalId: string, 
    serviceDuration: number
  ): { isAvailable: boolean; conflictReason?: string } => {
    if (!selectedDate) return { isAvailable: false };

    const [hours, minutes] = time.split(':').map(Number);
    const slotStart = new Date();
    slotStart.setHours(hours, minutes, 0, 0);
    
    const slotEnd = addMinutes(slotStart, serviceDuration);
    
    // Verificar conflitos com agendamentos existentes
    for (const appointment of appointments) {
      if (appointment.professional_id !== professionalId) continue;
      
      const [aptHours, aptMinutes] = appointment.appointment_time.split(':').map(Number);
      const aptStart = new Date();
      aptStart.setHours(aptHours, aptMinutes, 0, 0);
      
      // Encontrar duração do serviço do agendamento
      const aptService = services.find(s => s.id === appointment.service_id);
      const aptDuration = aptService?.duration || 30; // Default 30min
      const aptEnd = addMinutes(aptStart, aptDuration);
      
      // Verificar sobreposição
      if (
        (slotStart >= aptStart && slotStart < aptEnd) ||
        (slotEnd > aptStart && slotEnd <= aptEnd) ||
        (slotStart <= aptStart && slotEnd >= aptEnd)
      ) {
        const professional = professionals.find(p => p.id === professionalId);
        return {
          isAvailable: false,
          conflictReason: `Ocupado com ${professional?.name || 'profissional'}`
        };
      }
    }

    return { isAvailable: true };
  };

  // Calcular disponibilidade para cada profissional
  const getAvailabilityByProfessional = (businessHours: any): Record<string, TimeSlot[]> => {
    if (!selectedDate || !selectedServiceId) return {};

    const selectedService = services.find(s => s.id === selectedServiceId);
    if (!selectedService) return {};

    const timeSlots = generateTimeSlots(businessHours, selectedDate);
    const availabilityMap: Record<string, TimeSlot[]> = {};

    professionals.forEach(professional => {
      if (!professional.is_available) return;

      availabilityMap[professional.id] = timeSlots.map(time => {
        const { isAvailable, conflictReason } = isTimeSlotAvailable(
          time, 
          professional.id, 
          selectedService.duration
        );

        return {
          time,
          isAvailable,
          conflictReason,
          professionalName: professional.name
        };
      });
    });

    return availabilityMap;
  };

  // Obter todos os horários únicos disponíveis (de qualquer profissional)
  const getAvailableTimeSlots = (businessHours: any): TimeSlot[] => {
    if (!selectedDate || !selectedServiceId) return [];

    const selectedService = services.find(s => s.id === selectedServiceId);
    if (!selectedService) return [];

    const timeSlots = generateTimeSlots(businessHours, selectedDate);
    const availableProfessionals = professionals.filter(p => p.is_available);
    
    return timeSlots.map(time => {
      // Verificar se pelo menos um profissional está disponível neste horário
      const availableProfessionals = professionals.filter(professional => {
        if (!professional.is_available) return false;
        
        const { isAvailable } = isTimeSlotAvailable(
          time,
          professional.id,
          selectedService.duration
        );
        
        return isAvailable;
      });

      return {
        time,
        isAvailable: availableProfessionals.length > 0,
        conflictReason: availableProfessionals.length === 0 ? 'Todos os profissionais ocupados' : undefined,
        professionalName: availableProfessionals.map(p => p.name).join(', ')
      };
    }).filter(slot => slot.isAvailable); // Só mostrar horários disponíveis
  };

  return {
    appointments,
    loading,
    getAvailabilityByProfessional,
    getAvailableTimeSlots,
    isTimeSlotAvailable
  };
};