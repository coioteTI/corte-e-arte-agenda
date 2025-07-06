import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { NotificacoesConfig } from "@/types/configuracoes";

interface NotificacoesSectionProps {
  configuracoes: NotificacoesConfig;
  onSwitchChange: (campo: string, valor: boolean) => void;
}

export const NotificacoesSection = ({ configuracoes, onSwitchChange }: NotificacoesSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="email-notifications">Notificações por Email</Label>
            <p className="text-sm text-muted-foreground">
              Receber confirmações e lembretes por email
            </p>
          </div>
          <Switch
            id="email-notifications"
            checked={configuracoes.email}
            onCheckedChange={(checked) => onSwitchChange("email", checked)}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="whatsapp-notifications">Notificações WhatsApp</Label>
            <p className="text-sm text-muted-foreground">
              Enviar mensagens automáticas via WhatsApp
            </p>
          </div>
          <Switch
            id="whatsapp-notifications"
            checked={configuracoes.whatsapp}
            onCheckedChange={(checked) => onSwitchChange("whatsapp", checked)}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="reminders">Lembretes Automáticos</Label>
            <p className="text-sm text-muted-foreground">
              Enviar lembretes 1 hora antes do agendamento
            </p>
          </div>
          <Switch
            id="reminders"
            checked={configuracoes.lembretes}
            onCheckedChange={(checked) => onSwitchChange("lembretes", checked)}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="confirmations">Confirmações de Agendamento</Label>
            <p className="text-sm text-muted-foreground">
              Enviar confirmação imediata após agendamento
            </p>
          </div>
          <Switch
            id="confirmations"
            checked={configuracoes.confirmacoes}
            onCheckedChange={(checked) => onSwitchChange("confirmacoes", checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
};