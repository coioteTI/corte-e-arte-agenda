import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageType } from "@/types/configuracoes";

interface MessageEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  messageTypes: MessageType[];
  editingMessageType: string;
  tempMessage: string;
  onTempMessageChange: (message: string) => void;
  onSaveMessage: () => void;
}

export const MessageEditDialog = ({
  isOpen,
  onOpenChange,
  messageTypes,
  editingMessageType,
  tempMessage,
  onTempMessageChange,
  onSaveMessage,
}: MessageEditDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Editar {messageTypes.find(t => t.key === editingMessageType)?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="message-content">Conteúdo da Mensagem</Label>
            <Textarea
              id="message-content"
              value={tempMessage}
              onChange={(e) => onTempMessageChange(e.target.value)}
              placeholder="Digite sua mensagem personalizada..."
              className="min-h-32"
            />
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Variáveis disponíveis:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="bg-gray-200 px-2 py-1 rounded">{"{nome}"} - Nome do cliente</span>
              <span className="bg-gray-200 px-2 py-1 rounded">{"{data}"} - Data do agendamento</span>
              <span className="bg-gray-200 px-2 py-1 rounded">{"{horario}"} - Horário do agendamento</span>
              <span className="bg-gray-200 px-2 py-1 rounded">{"{empresa}"} - Nome da empresa</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <h4 className="text-sm font-medium mb-2 text-blue-800">💡 Dica para Anexos:</h4>
            <p className="text-sm text-blue-700 mb-2">
              Para incluir anexos, adicione links diretos na mensagem:
            </p>
            <div className="text-sm text-blue-600 font-mono bg-white p-2 rounded border">
              Para mais detalhes, acesse: https://drive.google.com/file/seu-arquivo
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button onClick={onSaveMessage}>
              Salvar Mensagem
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};