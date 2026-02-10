import { useState, useEffect, useRef } from 'react';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, Loader2, CheckCircle, Building2, User, 
  MessageSquare, Phone, Mail, MapPin, Mic, Square, Play, Pause
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  ticket_id: string;
  sender_type: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface TicketCompany {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
}

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  companies: TicketCompany | null;
}

interface SupportChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket | null;
  onTicketResolved: () => void;
}

const SUPABASE_URL = "https://gwyickztdeiplccievyt.supabase.co";

const SupportChatDialog = ({ open, onOpenChange, ticket, onTicketResolved }: SupportChatDialogProps) => {
  const { session } = useSuperAdmin();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [sendingAudio, setSendingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (open && ticket) {
      loadMessages();
    }
  }, [open, ticket]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async () => {
    if (!session?.token || !ticket) return;
    setLoading(true);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/super-admin-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': session.token
        },
        body: JSON.stringify({ 
          action: 'get_ticket_details',
          params: { ticket_id: ticket.id }
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessages(data.data.messages || []);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !ticket || !session?.token) return;
    setSending(true);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/super-admin-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': session.token
        },
        body: JSON.stringify({ 
          action: 'send_ticket_message',
          params: { 
            ticket_id: ticket.id,
            message: newMessage
          }
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        loadMessages();
        toast.success('Mensagem enviada');
      }
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const handleResolveTicket = async () => {
    if (!ticket || !session?.token) return;
    setResolving(true);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/super-admin-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': session.token
        },
        body: JSON.stringify({ 
          action: 'update_ticket_status',
          params: { 
            ticket_id: ticket.id,
            status: 'resolved'
          }
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Chamado finalizado com sucesso');
        onOpenChange(false);
        onTicketResolved();
      }
    } catch (error) {
      toast.error('Erro ao finalizar chamado');
    } finally {
      setResolving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  // Audio functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch { toast.error('Não foi possível acessar o microfone'); }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false); };
  const cancelAudio = () => { setAudioBlob(null); if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioUrl(null); setIsPlayingAudio(false); };

  const togglePlayAudio = () => {
    if (!audioUrl) return;
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio(audioUrl);
      audioPlayerRef.current.onended = () => setIsPlayingAudio(false);
    }
    if (isPlayingAudio) { audioPlayerRef.current.pause(); setIsPlayingAudio(false); }
    else { audioPlayerRef.current.play(); setIsPlayingAudio(true); }
  };

  const sendAudioMessage = async () => {
    if (!audioBlob || !ticket || !session?.token) return;
    setSendingAudio(true);
    try {
      const fileName = `audio_${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage.from('support-audio').upload(fileName, audioBlob, { contentType: 'audio/webm' });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('support-audio').getPublicUrl(fileName);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/super-admin-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-super-admin-token': session.token },
        body: JSON.stringify({ action: 'send_ticket_message', params: { ticket_id: ticket.id, message: `[AUDIO]${publicUrl}` } })
      });
      const data = await response.json();
      if (data.success) { cancelAudio(); loadMessages(); toast.success('Áudio enviado'); }
    } catch { toast.error('Erro ao enviar áudio'); }
    finally { setSendingAudio(false); }
  };

  const renderMessageContent = (message: string) => {
    if (message.startsWith('[AUDIO]')) {
      const url = message.replace('[AUDIO]', '');
      return <audio controls className="max-w-full" preload="metadata"><source src={url} type="audio/webm" /></audio>;
    }
    return <p className="text-sm whitespace-pre-wrap">{message}</p>;
  };

  if (!ticket) return null;
  const company = ticket.companies;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[85vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="p-4 border-b flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg truncate">{ticket.subject}</DialogTitle>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Building2 className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{company?.name || 'Cliente'}</span>
              </div>
            </div>
            {ticket.status !== 'resolved' && (
              <Button
                variant="default"
                size="sm"
                onClick={handleResolveTicket}
                disabled={resolving}
                className="bg-green-600 hover:bg-green-700 flex-shrink-0"
              >
                {resolving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Finalizar
                  </>
                )}
              </Button>
            )}
          </div>
          
          {/* Contact Buttons */}
          {company && (
            <div className="flex flex-wrap gap-2 mt-3">
              {company.phone && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleCall(company.phone!)}
                  className="text-xs"
                >
                  <Phone className="w-3 h-3 mr-1" />
                  Ligar Loja
                </Button>
              )}
              {company.email && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleEmail(company.email)}
                  className="text-xs"
                >
                  <Mail className="w-3 h-3 mr-1" />
                  Email
                </Button>
              )}
              {company.city && company.state && (
                <Badge variant="secondary" className="text-xs">
                  <MapPin className="w-3 h-3 mr-1" />
                  {company.city}/{company.state}
                </Badge>
              )}
            </div>
          )}
          
          {/* Description */}
          <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
            <p className="text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
          </div>
        </DialogHeader>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-4" ref={scrollRef}>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
                <p className="text-xs text-muted-foreground mt-1">Envie uma mensagem para iniciar o atendimento</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        msg.sender_type === 'admin'
                          ? 'bg-primary text-primary-foreground rounded-br-none'
                          : 'bg-muted rounded-bl-none'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {msg.sender_type === 'admin' ? (
                          <Badge variant="secondary" className="text-xs">
                            <User className="w-3 h-3 mr-1" />Suporte
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <Building2 className="w-3 h-3 mr-1" />Cliente
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-xs mt-1 ${
                        msg.sender_type === 'admin' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Input */}
        {ticket.status !== 'resolved' && (
          <div className="p-4 border-t flex-shrink-0">
            <div className="flex gap-2">
              <Textarea
                placeholder="Digite sua resposta..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                className="resize-none"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                className="px-3"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pressione Enter para enviar
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SupportChatDialog;
