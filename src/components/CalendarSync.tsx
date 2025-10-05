import { useState } from 'react';
import { Calendar, Download, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CalendarSyncProps {
  appointment?: {
    id: string;
    appointment_date: string;
    appointment_time: string;
    companies?: { name: string; address?: string };
    services?: { name: string };
    professionals?: { name: string };
  };
}

export const CalendarSync = ({ appointment }: CalendarSyncProps) => {
  const [generating, setGenerating] = useState(false);

  const generateICSFile = () => {
    if (!appointment) return;

    setGenerating(true);

    try {
      const startDate = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hora depois

      const formatDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Corte & Arte//Agendamento//PT
BEGIN:VEVENT
UID:${appointment.id}@corteearte.site
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${appointment.services?.name || 'Serviço'} - ${appointment.companies?.name || 'Empresa'}
DESCRIPTION:Agendamento confirmado\\nProfissional: ${appointment.professionals?.name || 'Não definido'}\\nServiço: ${appointment.services?.name || 'Não definido'}
LOCATION:${appointment.companies?.address || 'Endereço não informado'}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `agendamento-${appointment.id}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Arquivo de calendário baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar arquivo ICS:', error);
      toast.error('Erro ao gerar arquivo de calendário');
    } finally {
      setGenerating(false);
    }
  };

  const addToGoogleCalendar = () => {
    if (!appointment) return;

    const startDate = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const formatGoogleDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const title = encodeURIComponent(`${appointment.services?.name || 'Serviço'} - ${appointment.companies?.name || 'Empresa'}`);
    const details = encodeURIComponent(`Profissional: ${appointment.professionals?.name || 'Não definido'}\nServiço: ${appointment.services?.name || 'Não definido'}`);
    const location = encodeURIComponent(appointment.companies?.address || '');

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}&details=${details}&location=${location}`;

    window.open(googleCalendarUrl, '_blank');
  };

  if (!appointment) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Adicionar ao Calendário
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sincronize este agendamento com seu calendário favorito:
          </p>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={addToGoogleCalendar}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              Google Calendar
            </Button>
            
            <Button
              onClick={generateICSFile}
              variant="outline"
              size="sm"
              disabled={generating}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              {generating ? 'Gerando...' : 'Baixar .ics'}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p><strong>Agendamento:</strong> {format(new Date(`${appointment.appointment_date}T${appointment.appointment_time}`), 'dd/MM/yyyy às HH:mm')}</p>
            <p><strong>Serviço:</strong> {appointment.services?.name}</p>
            <p><strong>Profissional:</strong> {appointment.professionals?.name}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};