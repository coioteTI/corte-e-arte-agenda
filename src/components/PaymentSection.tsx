import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, CreditCard, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { PaymentProofUpload } from "./PaymentProofUpload";
import { cn } from "@/lib/utils";

interface PaymentSectionProps {
  companySettings: any;
  selectedPaymentMethod: string | undefined;
  onPaymentMethodChange: (method: string) => void;
  onProofUploaded: (url: string) => void;
  appointmentId?: string;
  showQrCode?: boolean;
}

export const PaymentSection = ({
  companySettings,
  selectedPaymentMethod,
  onPaymentMethodChange,
  onProofUploaded,
  appointmentId,
  showQrCode = true
}: PaymentSectionProps) => {
  const [proofUploaded, setProofUploaded] = useState(false);

  const handleProofUpload = (url: string) => {
    setProofUploaded(true);
    onProofUploaded(url);
  };

  if (!companySettings?.payment_methods || companySettings.payment_methods.length === 0) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertCircle className="h-5 w-5" />
            <span>Métodos de pagamento não configurados para esta empresa.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label className="text-base font-medium flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Forma de Pagamento *
        </Label>
        
        <div className="grid grid-cols-1 gap-3">
          {/* Opção PIX */}
          {companySettings.payment_methods.includes('pix') && companySettings.pix_key && (
            <Card 
              className={cn(
                "cursor-pointer transition-all border-2",
                selectedPaymentMethod === 'pix' 
                  ? "border-primary bg-primary/5 shadow-sm" 
                  : "border-muted hover:border-primary/50"
              )}
              onClick={() => onPaymentMethodChange('pix')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                    {selectedPaymentMethod === 'pix' && (
                      <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      <QrCode className="h-5 w-5 text-primary" />
                      PIX
                      <Badge variant="secondary" className="text-xs">Instantâneo</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Pagamento via PIX - Aprovação rápida
                    </div>
                  </div>
                </div>

                {/* Detalhes do PIX quando selecionado */}
                {selectedPaymentMethod === 'pix' && (
                  <div className="mt-4 space-y-4">
                    <div className="p-3 bg-background rounded-lg border">
                      <div className="text-sm font-medium mb-2">Dados para Pagamento:</div>
                      
                      {/* Chave PIX */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Chave PIX:</Label>
                        <div className="flex items-center justify-between p-2 bg-muted rounded border font-mono text-sm">
                          <span>{companySettings.pix_key}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(companySettings.pix_key);
                            }}
                          >
                            📋 Copiar
                          </Button>
                        </div>
                      </div>

                      {/* QR Code se disponível */}
                      {showQrCode && companySettings.pix_qr_code && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">QR Code PIX:</Label>
                          <div className="text-xs bg-muted p-2 rounded border font-mono">
                            {companySettings.pix_qr_code.substring(0, 50)}...
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Aviso sobre confirmação */}
                    {companySettings.requires_payment_confirmation && (
                      <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
                        <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium">Confirmação necessária</div>
                          <div>Seu agendamento será confirmado após o envio do comprovante de pagamento.</div>
                        </div>
                      </div>
                    )}

                    {/* Upload de comprovante */}
                    {companySettings.requires_payment_confirmation && (
                      <PaymentProofUpload
                        onUploadComplete={handleProofUpload}
                        appointmentId={appointmentId}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Opção Pagamento no Local */}
          {companySettings.payment_methods.includes('no_local') && (
            <Card 
              className={cn(
                "cursor-pointer transition-all border-2",
                selectedPaymentMethod === 'no_local' 
                  ? "border-primary bg-primary/5 shadow-sm" 
                  : "border-muted hover:border-primary/50"
              )}
              onClick={() => onPaymentMethodChange('no_local')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                    {selectedPaymentMethod === 'no_local' && (
                      <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      <CreditCard className="h-5 w-5 text-primary" />
                      Pagamento no Local
                      <Badge variant="secondary" className="text-xs">Dinheiro/Cartão</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Pague diretamente no estabelecimento
                    </div>
                  </div>
                </div>

                {selectedPaymentMethod === 'no_local' && (
                  <div className="mt-4 p-3 bg-green-50 text-green-800 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Agendamento confirmado!</div>
                        <div>Você pode pagar no momento do atendimento.</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Instruções gerais */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="text-sm space-y-2">
            <div className="font-medium">📋 Como funciona:</div>
            <ul className="space-y-1 text-muted-foreground">
              {companySettings.payment_methods.includes('pix') && (
                <li>• <strong>PIX:</strong> {companySettings.requires_payment_confirmation ? 'Envie o comprovante para confirmar' : 'Pagamento instantâneo'}</li>
              )}
              {companySettings.payment_methods.includes('no_local') && (
                <li>• <strong>No Local:</strong> Agendamento confirmado, pague na hora do serviço</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};