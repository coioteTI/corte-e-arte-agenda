import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BusinessHours {
  [key: string]: {
    isOpen: boolean;
    start: string;
    end: string;
  };
}

export const useBusinessHours = (companyId: string) => {
  const [businessHours, setBusinessHours] = useState<BusinessHours | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) {
      loadBusinessHours();
    }
  }, [companyId]);

  const loadBusinessHours = async () => {
    try {
      console.log('Loading business hours for company:', companyId);
      
      const { data, error } = await supabase
        .from('companies')
        .select('business_hours')
        .eq('id', companyId)
        .maybeSingle();

      if (error) {
        console.error('Error querying business hours:', error);
        throw error;
      }

      console.log('Business hours data retrieved:', data);

      if (data?.business_hours) {
        console.log('Setting business hours:', data.business_hours);
        setBusinessHours(data.business_hours as BusinessHours);
      } else {
        console.log('No business hours found, using default');
        // Set default business hours if none exist
        const defaultHours = {
          monday: { isOpen: true, start: "08:00", end: "18:00" },
          tuesday: { isOpen: true, start: "08:00", end: "18:00" },
          wednesday: { isOpen: true, start: "08:00", end: "18:00" },
          thursday: { isOpen: true, start: "08:00", end: "18:00" },
          friday: { isOpen: true, start: "08:00", end: "18:00" },
          saturday: { isOpen: true, start: "08:00", end: "18:00" },
          sunday: { isOpen: false, start: "08:00", end: "18:00" }
        };
        setBusinessHours(defaultHours);
      }
    } catch (error) {
      console.error('Error loading business hours:', error);
      // Set default hours even if there's an error
      const defaultHours = {
        monday: { isOpen: true, start: "08:00", end: "18:00" },
        tuesday: { isOpen: true, start: "08:00", end: "18:00" },
        wednesday: { isOpen: true, start: "08:00", end: "18:00" },
        thursday: { isOpen: true, start: "08:00", end: "18:00" },
        friday: { isOpen: true, start: "08:00", end: "18:00" },
        saturday: { isOpen: true, start: "08:00", end: "18:00" },
        sunday: { isOpen: false, start: "08:00", end: "18:00" }
      };
      setBusinessHours(defaultHours);
    } finally {
      setLoading(false);
    }
  };

  const isDayOpen = (dayOfWeek: string): boolean => {
    if (!businessHours) return true; // Default to open if no hours set
    return businessHours[dayOfWeek]?.isOpen || false;
  };

  const getAvailableHours = (dayOfWeek: string): { start: string; end: string } | null => {
    if (!businessHours || !isDayOpen(dayOfWeek)) return null;
    return {
      start: businessHours[dayOfWeek].start,
      end: businessHours[dayOfWeek].end
    };
  };

  const isDateAvailable = (date: Date): boolean => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[date.getDay()];
    return isDayOpen(dayOfWeek);
  };

  const getAvailableTimeSlotsForDate = (date: Date, duration: number = 30): string[] => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[date.getDay()];
    
    const hours = getAvailableHours(dayOfWeek);
    if (!hours) return [];

    const slots: string[] = [];
    const [startHour, startMinute] = hours.start.split(':').map(Number);
    const [endHour, endMinute] = hours.end.split(':').map(Number);
    
    let currentTime = startHour * 60 + startMinute; // Convert to minutes
    const endTime = endHour * 60 + endMinute;
    
    while (currentTime + duration <= endTime) {
      const hour = Math.floor(currentTime / 60);
      const minute = currentTime % 60;
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeString);
      currentTime += duration;
    }
    
    return slots;
  };

  return {
    businessHours,
    loading,
    isDayOpen,
    getAvailableHours,
    isDateAvailable,
    getAvailableTimeSlotsForDate,
    reload: loadBusinessHours
  };
};