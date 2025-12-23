import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, Globe, MapPin, Save, Loader2 } from "lucide-react";
import { useTimezone, BRAZIL_TIMEZONES, getCurrentTimeInTimezone } from "@/hooks/useTimezone";

interface FusoHorarioSectionProps {
  companyId: string;
}

export const FusoHorarioSection = ({ companyId }: FusoHorarioSectionProps) => {
  const { timezone, saveTimezone, loading } = useTimezone(companyId);
  const [selectedTimezone, setSelectedTimezone] = useState<string>(timezone);
  const [saving, setSaving] = useState(false);

  // Update selected when timezone loads
  useEffect(() => {
    setSelectedTimezone(timezone);
  }, [timezone]);

  const handleSave = async () => {
    if (!selectedTimezone) return;

    setSaving(true);
    try {
      const success = await saveTimezone(selectedTimezone);
      if (success) {
        toast.success("Fuso horário atualizado com sucesso!");
      } else {
        toast.error("Erro ao salvar fuso horário");
      }
    } catch (error) {
      toast.error("Erro ao salvar fuso horário");
    } finally {
      setSaving(false);
    }
  };

  const getCurrentTimezoneLabel = () => {
    const tz = BRAZIL_TIMEZONES.find(t => t.value === timezone);
    return tz?.label || timezone;
  };

  const currentTime = getCurrentTimeInTimezone(timezone);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Fuso Horário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Fuso Horário
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <Clock className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Horário atual do sistema</p>
            <p className="text-lg font-bold text-primary">{currentTime}</p>
            <p className="text-xs text-muted-foreground">{getCurrentTimezoneLabel()}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Selecione o Fuso Horário</Label>
          <Select
            value={selectedTimezone}
            onValueChange={setSelectedTimezone}
          >
            <SelectTrigger id="timezone">
              <SelectValue placeholder="Selecione o fuso horário" />
            </SelectTrigger>
            <SelectContent>
              {BRAZIL_TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    <span>{tz.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            O fuso horário será usado para calcular corretamente os salários, relatórios e históricos.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            <MapPin className="h-3 w-3 mr-1" />
            Salário
          </Badge>
          <Badge variant="outline" className="text-xs">
            <MapPin className="h-3 w-3 mr-1" />
            Histórico
          </Badge>
          <Badge variant="outline" className="text-xs">
            <MapPin className="h-3 w-3 mr-1" />
            Relatórios
          </Badge>
          <Badge variant="outline" className="text-xs">
            <MapPin className="h-3 w-3 mr-1" />
            Estoque
          </Badge>
        </div>

        {selectedTimezone !== timezone && (
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Fuso Horário
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
