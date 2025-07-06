import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { SistemaConfig } from "@/types/configuracoes";

interface SistemaSectionProps {
  configuracoes: SistemaConfig;
  onSwitchChange: (campo: string, valor: boolean) => void;
}

export const SistemaSection = ({ configuracoes, onSwitchChange }: SistemaSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Funcionalidades do Sistema</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="agendamento-online">Agendamento Online</Label>
            <p className="text-sm text-muted-foreground">
              Permitir que clientes agendem pela internet
            </p>
          </div>
          <Switch
            id="agendamento-online"
            checked={configuracoes.agendamentoOnline}
            onCheckedChange={(checked) => onSwitchChange("agendamentoOnline", checked)}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="pagamento-online">Pagamento Online</Label>
            <p className="text-sm text-muted-foreground">
              Aceitar pagamentos via cartão ou PIX
            </p>
          </div>
          <Switch
            id="pagamento-online"
            checked={configuracoes.pagamentoOnline}
            onCheckedChange={(checked) => onSwitchChange("pagamentoOnline", checked)}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="relatorios-avancados">Relatórios Avançados</Label>
            <p className="text-sm text-muted-foreground">
              Gerar relatórios detalhados de performance
            </p>
          </div>
          <Switch
            id="relatorios-avancados"
            checked={configuracoes.relatoriosAvancados}
            onCheckedChange={(checked) => onSwitchChange("relatoriosAvancados", checked)}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="integracao-whatsapp">Integração WhatsApp</Label>
            <p className="text-sm text-muted-foreground">
              Conectar com API do WhatsApp Business
            </p>
          </div>
          <Switch
            id="integracao-whatsapp"
            checked={configuracoes.integracaoWhatsApp}
            onCheckedChange={(checked) => onSwitchChange("integracaoWhatsApp", checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
};