import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Clock, Eye, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PaymentStatusManagerProps {
  appointment: any;
  onStatusUpdate: (appointmentId: string, newStatus: string) => void;
  companyId: string;
}

export const PaymentStatusManager = ({ 
  appointment, 
  onStatusUpdate, 
  companyId 
}: PaymentStatusManagerProps) => {
  const [updating, setUpdating] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'awaiting_payment': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Pago';
      case 'pending': return 'Pendente';
      case 'awaiting_payment': return 'Aguardando Confirmação';
      case 'rejected': return 'Rejeitado';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'awaiting_payment': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <XCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const updatePaymentStatus = async (newStatus: string, reason?: string) => {
    setUpdating(true);
    try {
      const updateData: any = {
        payment_status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'paid') {
        updateData.payment_confirmation_date = new Date().toISOString();
        updateData.status = 'confirmed';
      }

      if (newStatus === 'rejected' && reason) {
        updateData.notes = `${appointment.notes || ''}\n\nMotivo da rejeição: ${reason}`.trim();
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointment.id);

      if (error) throw error;

      // Enviar notificação ao cliente
      await sendNotificationToClient(newStatus, reason);

      onStatusUpdate(appointment.id, newStatus);
      
      const statusMessages = {
        paid: 'Pagamento confirmado com sucesso!',
        rejected: 'Pagamento rejeitado.',
        pending: 'Status alterado para pendente.'
      };

      toast.success(statusMessages[newStatus as keyof typeof statusMessages] || 'Status atualizado!');
      
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status do pagamento');
    } finally {
      setUpdating(false);
      setShowRejectDialog(false);
      setRejectReason('');
    }
  };

  const sendNotificationToClient = async (status: string, reason?: string) => {
    try {
      let message = '';
      
      switch (status) {
        case 'paid':
          message = `✅ Pagamento confirmado! Seu agendamento para ${appointment.appointment_date} às ${appointment.appointment_time} está garantido. Aguardamos você!`;
          break;
        case 'rejected':
          message = `❌ Comprovante não aprovado. ${reason || 'Entre em contato para esclarecer o pagamento.'}`;
          break;
      }

      if (message) {
        // Aqui você implementaria o envio via WhatsApp, email, etc.
        console.log('Enviando notificação para cliente:', message);
      }
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
    }
  };

  return (
    <div className="space-y-3">
      {/* Status atual */}
      <div className="flex items-center gap-2">
        {getStatusIcon(appointment.payment_status)}
        <Badge 
          variant="secondary" 
          className={getStatusColor(appointment.payment_status)}
        >
          {getStatusText(appointment.payment_status)}
        </Badge>
      </div>

      {/* Comprovante de pagamento */}
      {appointment.pix_payment_proof && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Comprovante PIX:</Label>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Ver Comprovante
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Comprovante de Pagamento PIX</DialogTitle>
              </DialogHeader>
              <div className="flex justify-center">
                <img 
                  src={appointment.pix_payment_proof} 
                  alt="Comprovante de pagamento"
                  className="max-w-full max-h-96 object-contain border rounded"
                />
              </div>
              <DialogFooter>
                <Button 
                  variant="outline"
                  onClick={() => window.open(appointment.pix_payment_proof, '_blank')}
                >
                  Abrir em Nova Aba
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Ações baseadas no status */}
      <div className="flex gap-2 flex-wrap">
        {appointment.payment_status === 'awaiting_payment' && (
          <>
            <Button
              size="sm"
              onClick={() => updatePaymentStatus('paid')}
              disabled={updating}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Aprovar Pagamento
            </Button>
            
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  disabled={updating}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Rejeitar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Rejeitar Comprovante</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="reject-reason">Motivo da rejeição:</Label>
                    <Textarea
                      id="reject-reason"
                      placeholder="Explique o motivo da rejeição..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => updatePaymentStatus('rejected', rejectReason)}
                    disabled={updating || !rejectReason.trim()}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Rejeitar Pagamento
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}

        {appointment.payment_status === 'pending' && appointment.payment_method === 'no_local' && (
          <Button
            size="sm"
            onClick={() => updatePaymentStatus('paid')}
            disabled={updating}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Marcar como Pago
          </Button>
        )}

        {appointment.payment_status === 'rejected' && (
          <Button
            size="sm"
            onClick={() => updatePaymentStatus('awaiting_payment')}
            disabled={updating}
            variant="outline"
          >
            <Clock className="h-4 w-4 mr-1" />
            Aguardar Novo Comprovante
          </Button>
        )}
      </div>

      {/* Data de confirmação */}
      {appointment.payment_confirmation_date && (
        <div className="text-xs text-muted-foreground">
          Confirmado em: {new Date(appointment.payment_confirmation_date).toLocaleString('pt-BR')}
        </div>
      )}
    </div>
  );
};