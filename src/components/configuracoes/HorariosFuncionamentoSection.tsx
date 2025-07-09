import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BusinessHours {
  [key: string]: {
    isOpen: boolean;
    start: string;
    end: string;
  };
}

interface HorariosFuncionamentoSectionProps {
  companyId: string;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

export const HorariosFuncionamentoSection = ({ companyId }: HorariosFuncionamentoSectionProps) => {
  const [businessHours, setBusinessHours] = useState<BusinessHours>({
    monday: { isOpen: true, start: "08:00", end: "18:00" },
    tuesday: { isOpen: true, start: "08:00", end: "18:00" },
    wednesday: { isOpen: true, start: "08:00", end: "18:00" },
    thursday: { isOpen: true, start: "08:00", end: "18:00" },
    friday: { isOpen: true, start: "08:00", end: "18:00" },
    saturday: { isOpen: true, start: "08:00", end: "18:00" },
    sunday: { isOpen: false, start: "08:00", end: "18:00" },
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (companyId) {
      loadBusinessHours();
    }
  }, [companyId]);

  const loadBusinessHours = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('business_hours')
        .eq('id', companyId)
        .single();

      if (error) throw error;

      if (data?.business_hours && typeof data.business_hours === 'object') {
        setBusinessHours(data.business_hours as BusinessHours);
      }
    } catch (error) {
      console.error('Error loading business hours:', error);
    }
  };

  const handleDayToggle = (day: string, isOpen: boolean) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOpen
      }
    }));
  };

  const handleTimeChange = (day: string, field: 'start' | 'end', value: string) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!companyId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ business_hours: businessHours })
        .eq('id', companyId);

      if (error) throw error;

      toast({
        title: "Horários atualizados",
        description: "Os horários de funcionamento foram salvos com sucesso!",
      });
    } catch (error) {
      console.error('Error saving business hours:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar os horários de funcionamento.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Horários de Funcionamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day.key} className="flex items-center space-x-4 p-4 border rounded-lg">
              <div className="flex items-center space-x-2 min-w-[140px]">
                <Checkbox
                  id={`${day.key}-open`}
                  checked={businessHours[day.key]?.isOpen || false}
                  onCheckedChange={(checked) => handleDayToggle(day.key, checked as boolean)}
                />
                <Label
                  htmlFor={`${day.key}-open`}
                  className={`text-sm font-medium ${!businessHours[day.key]?.isOpen ? 'text-muted-foreground' : ''}`}
                >
                  {day.label}
                </Label>
              </div>

              {businessHours[day.key]?.isOpen && (
                <div className="flex items-center space-x-2">
                  <div className="space-y-1">
                    <Label htmlFor={`${day.key}-start`} className="text-xs">
                      Início
                    </Label>
                    <Input
                      id={`${day.key}-start`}
                      type="time"
                      value={businessHours[day.key]?.start || "08:00"}
                      onChange={(e) => handleTimeChange(day.key, 'start', e.target.value)}
                      className="w-24"
                    />
                  </div>
                  <span className="pt-6 text-muted-foreground">às</span>
                  <div className="space-y-1">
                    <Label htmlFor={`${day.key}-end`} className="text-xs">
                      Fim
                    </Label>
                    <Input
                      id={`${day.key}-end`}
                      type="time"
                      value={businessHours[day.key]?.end || "18:00"}
                      onChange={(e) => handleTimeChange(day.key, 'end', e.target.value)}
                      className="w-24"
                    />
                  </div>
                </div>
              )}

              {!businessHours[day.key]?.isOpen && (
                <span className="text-sm text-muted-foreground">Fechado</span>
              )}
            </div>
          ))}
        </div>

        <Button onClick={handleSave} disabled={isSaving || !companyId} className="w-full">
          {isSaving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </CardContent>
    </Card>
  );
};