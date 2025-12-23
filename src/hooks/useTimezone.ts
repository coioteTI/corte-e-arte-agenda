import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Brazilian timezone options
export const BRAZIL_TIMEZONES = [
  { value: "America/Sao_Paulo", label: "Brasília (GMT-3)", states: ["SP", "RJ", "MG", "ES", "BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA", "GO", "DF", "TO", "PR", "SC", "RS"] },
  { value: "America/Manaus", label: "Amazonas (GMT-4)", states: ["AM", "RR", "RO", "MT", "MS"] },
  { value: "America/Cuiaba", label: "Cuiabá (GMT-4)", states: ["MT", "MS"] },
  { value: "America/Belem", label: "Belém (GMT-3)", states: ["PA", "AP"] },
  { value: "America/Fortaleza", label: "Fortaleza (GMT-3)", states: ["CE", "RN", "PB", "PE", "AL", "SE", "PI", "MA"] },
  { value: "America/Recife", label: "Recife (GMT-3)", states: ["PE", "AL", "SE", "PB", "RN"] },
  { value: "America/Rio_Branco", label: "Rio Branco (GMT-5)", states: ["AC"] },
  { value: "America/Noronha", label: "Fernando de Noronha (GMT-2)", states: ["PE"] },
];

// Get today's date in a specific timezone
export function getTodayInTimezone(timezone: string): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(now);
  return new Date(dateStr + 'T00:00:00');
}

// Format a date to YYYY-MM-DD in a specific timezone
export function formatDateInTimezone(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

// Parse a date string considering the timezone
export function parseDateInTimezone(dateStr: string, timezone: string): Date {
  // The date from DB is in format YYYY-MM-DD and should be interpreted in the company's timezone
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Check if two dates are the same day in a specific timezone
export function isSameDayInTimezone(date1: Date, date2: Date, timezone: string): boolean {
  return formatDateInTimezone(date1, timezone) === formatDateInTimezone(date2, timezone);
}

// Get current time in timezone
export function getCurrentTimeInTimezone(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return formatter.format(now);
}

export function useTimezone(companyId: string | null) {
  const [timezone, setTimezone] = useState<string>("America/Sao_Paulo");
  const [loading, setLoading] = useState(true);

  const loadTimezone = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select("timezone")
        .eq("company_id", companyId)
        .maybeSingle();

      if (error) {
        console.error("Error loading timezone:", error);
        return;
      }

      if (data?.timezone) {
        setTimezone(data.timezone);
      }
    } catch (error) {
      console.error("Error loading timezone:", error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const saveTimezone = useCallback(async (newTimezone: string) => {
    if (!companyId) return false;

    try {
      const { error } = await supabase
        .from("company_settings")
        .update({ timezone: newTimezone })
        .eq("company_id", companyId);

      if (error) throw error;

      setTimezone(newTimezone);
      return true;
    } catch (error) {
      console.error("Error saving timezone:", error);
      return false;
    }
  }, [companyId]);

  useEffect(() => {
    loadTimezone();
  }, [loadTimezone]);

  return {
    timezone,
    loading,
    saveTimezone,
    reloadTimezone: loadTimezone,
  };
}
