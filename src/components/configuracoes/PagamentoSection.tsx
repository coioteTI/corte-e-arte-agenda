import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { PagamentoConfig } from "@/types/configuracoes";
import { CreditCard, QrCode } from "lucide-react";

interface PagamentoSectionProps {
  configuracoes: PagamentoConfig;
  onInputChange: (campo: string, valor: string | string[] | boolean) => void;
}

export const PagamentoSection = ({ configuracoes, onInputChange }: PagamentoSectionProps) => {
  const handlePaymentMethodChange = (method: string, checked: boolean) => {
    const currentMethods = configuracoes.paymentMethods || [];
    let newMethods;
    
    if (checked) {
      newMethods = [...currentMethods, method];
    } else {
      newMethods = currentMethods.filter(m => m !== method);
    }
    
    onInputChange("paymentMethods", newMethods);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Configurações de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Métodos de Pagamento Aceitos */}
        <div>
          <Label className="text-base font-medium">Métodos de Pagamento Aceitos</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Selecione as formas de pagamento que sua empresa aceita
          </p>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pix"
                checked={configuracoes.paymentMethods?.includes("pix") || false}
                onCheckedChange={(checked) => handlePaymentMethodChange("pix", checked as boolean)}
              />
              <Label htmlFor="pix" className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                PIX
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="no_local"
                checked={configuracoes.paymentMethods?.includes("no_local") || false}
                onCheckedChange={(checked) => handlePaymentMethodChange("no_local", checked as boolean)}
              />
              <Label htmlFor="no_local" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Pagamento no Local
              </Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Configurações PIX */}
        {configuracoes.paymentMethods?.includes("pix") && (
          <>
            <div>
              <Label htmlFor="pixKey">Chave PIX</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Digite sua chave PIX (CPF, CNPJ, telefone, e-mail ou chave aleatória)
              </p>
              <Input
                id="pixKey"
                value={configuracoes.pixKey || ""}
                onChange={(e) => onInputChange("pixKey", e.target.value)}
                placeholder="Ex: 11999999999 ou email@exemplo.com"
              />
            </div>

            <div>
              <Label htmlFor="pixQrCode">QR Code PIX (Opcional)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Cole aqui o código do QR Code PIX estático gerado pelo seu banco
              </p>
              <Textarea
                id="pixQrCode"
                value={configuracoes.pixQrCode || ""}
                onChange={(e) => onInputChange("pixQrCode", e.target.value)}
                placeholder="00020126580..."
                rows={3}
              />
            </div>

            <Separator />
          </>
        )}

        {/* Confirmação de Pagamento */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="requiresPaymentConfirmation"
            checked={configuracoes.requiresPaymentConfirmation}
            onCheckedChange={(checked) => onInputChange("requiresPaymentConfirmation", checked as boolean)}
          />
          <div>
            <Label htmlFor="requiresPaymentConfirmation">Exigir confirmação de pagamento PIX</Label>
            <p className="text-sm text-muted-foreground">
              Quando ativado, o cliente precisará comprovar o pagamento PIX antes do agendamento ser confirmado
            </p>
          </div>
        </div>

        {/* Informações Adicionais */}
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">ℹ️ Como funciona</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Somente PIX:</strong> Cliente deve pagar antes do agendamento ser confirmado</li>
            <li>• <strong>Somente no Local:</strong> Agendamento confirmado, pagamento na hora do serviço</li>
            <li>• <strong>PIX ou Local:</strong> Cliente escolhe a forma de pagamento no agendamento</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};