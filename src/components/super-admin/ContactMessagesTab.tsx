import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  MessageCircle, 
  Mail, 
  Phone, 
  Calendar, 
  Search,
  RefreshCw,
  CheckCircle,
  ExternalLink,
  Send,
  Loader2,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  source: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  ticket_id?: string;
}

interface ChatMessage {
  id: string;
  sender_type: string;
  message: string;
  created_at: string;
}

const ContactMessagesTab = () => {
  const { session } = useSuperAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactMessage | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  const { data: messages, isLoading, refetch } = useQuery({
    queryKey: ['super-admin-contact-messages', session?.token],
    queryFn: async () => {
      const response = await fetch(
        'https://gwyickztdeiplccievyt.supabase.co/functions/v1/super-admin-data',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-super-admin-token': session?.token || '',
          },
          body: JSON.stringify({
            action: 'get_contact_messages',
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to fetch contact messages');
      const data = await response.json();
      return (data.data?.messages || data.messages || []) as ContactMessage[];
    },
    enabled: !!session?.token,
  });

  const handleMarkAsRead = async (messageId: string) => {
    try {
      await fetch(
        'https://gwyickztdeiplccievyt.supabase.co/functions/v1/super-admin-data',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-super-admin-token': session?.token || '',
          },
          body: JSON.stringify({
            action: 'mark_contact_read',
            params: { message_id: messageId },
          }),
        }
      );
      refetch();
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleOpenChat = async (contact: ContactMessage) => {
    setSelectedContact(contact);
    setChatOpen(true);
    setLoadingChat(true);

    // Mark as read when opening chat
    if (!contact.is_read) {
      handleMarkAsRead(contact.id);
    }

    // Load chat messages if there's a ticket associated
    if (contact.ticket_id) {
      try {
        const response = await fetch(
          'https://gwyickztdeiplccievyt.supabase.co/functions/v1/super-admin-data',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-super-admin-token': session?.token || '',
            },
            body: JSON.stringify({
              action: 'get_ticket_details',
              params: { ticket_id: contact.ticket_id },
            }),
          }
        );
        const data = await response.json();
        if (data.success) {
          setChatMessages(data.data.messages || []);
        }
      } catch (error) {
        console.error('Error loading chat:', error);
      }
    } else {
      // If no ticket, just show the original message
      setChatMessages([{
        id: contact.id,
        sender_type: 'company',
        message: contact.message,
        created_at: contact.created_at
      }]);
    }
    setLoadingChat(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;
    setSendingMessage(true);

    try {
      // If contact has a ticket, use ticket messaging
      if (selectedContact.ticket_id) {
        const response = await fetch(
          'https://gwyickztdeiplccievyt.supabase.co/functions/v1/super-admin-data',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-super-admin-token': session?.token || '',
            },
            body: JSON.stringify({
              action: 'send_ticket_message',
              params: {
                ticket_id: selectedContact.ticket_id,
                message: newMessage
              },
            }),
          }
        );
        const data = await response.json();
        if (data.success) {
          setNewMessage('');
          // Reload messages
          const detailsResponse = await fetch(
            'https://gwyickztdeiplccievyt.supabase.co/functions/v1/super-admin-data',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-super-admin-token': session?.token || '',
              },
              body: JSON.stringify({
                action: 'get_ticket_details',
                params: { ticket_id: selectedContact.ticket_id },
              }),
            }
          );
          const detailsData = await detailsResponse.json();
          if (detailsData.success) {
            setChatMessages(detailsData.data.messages || []);
          }
          toast.success('Mensagem enviada');
        }
      } else {
        // Create a ticket for this contact and send message
        const response = await fetch(
          'https://gwyickztdeiplccievyt.supabase.co/functions/v1/super-admin-data',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-super-admin-token': session?.token || '',
            },
            body: JSON.stringify({
              action: 'reply_to_contact',
              params: {
                contact_id: selectedContact.id,
                message: newMessage,
                contact_email: selectedContact.email,
                contact_name: selectedContact.name
              },
            }),
          }
        );
        const data = await response.json();
        if (data.success) {
          setNewMessage('');
          setChatMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            sender_type: 'admin',
            message: newMessage,
            created_at: new Date().toISOString()
          }]);
          toast.success('Resposta enviada');
          refetch();
        }
      }
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredMessages = messages?.filter(msg => {
    const matchesSearch = 
      msg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'unread') return matchesSearch && !msg.is_read;
    return matchesSearch;
  }) || [];

  const unreadCount = messages?.filter(m => !m.is_read).length || 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            Mensagens de Contato
          </h2>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} não lidas` : 'Todas lidas'}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="flex-1 sm:flex-none"
          >
            Todas
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
            className="flex-1 sm:flex-none"
          >
            Não lidas ({unreadCount})
          </Button>
        </div>
      </div>

      {/* Messages List */}
      {filteredMessages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma mensagem encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map((msg) => (
            <Card 
              key={msg.id} 
              className={`transition-colors ${!msg.is_read ? 'border-primary/50 bg-primary/5' : ''}`}
            >
              <CardHeader className="pb-3">
                {/* Mobile-first stacked layout */}
                <div className="space-y-3">
                  {/* Row 1: Avatar + Name + Badges */}
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!msg.is_read ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {msg.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base sm:text-lg truncate">
                          {msg.name}
                        </CardTitle>
                        {!msg.is_read && (
                          <Badge variant="default" className="text-xs">Novo</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">{msg.source}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Contact info - stacked on mobile */}
                  <div className="flex flex-col gap-1.5 text-sm text-muted-foreground pl-0 sm:pl-13">
                    <a 
                      href={`mailto:${msg.email}`} 
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{msg.email}</span>
                    </a>
                    {msg.phone && (
                      <button 
                        onClick={() => handleCall(msg.phone!)}
                        className="flex items-center gap-2 hover:text-primary transition-colors text-left"
                      >
                        <Phone className="w-4 h-4 flex-shrink-0" />
                        <span>{msg.phone}</span>
                      </button>
                    )}
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      {format(new Date(msg.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>

                  {/* Row 3: Mark as read button */}
                  {!msg.is_read && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleMarkAsRead(msg.id)}
                      className="w-full sm:w-auto"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Marcar como lida
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Message content */}
                <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                  <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
                </div>

                {/* Action buttons - stacked on mobile */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => handleOpenChat(msg)}
                    className="w-full sm:w-auto"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Responder no Chat
                  </Button>
                  
                  {msg.phone && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCall(msg.phone!)}
                      className="w-full sm:w-auto"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Ligar
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(`mailto:${msg.email}?subject=Re: Mensagem de Contato - Corte & Arte`, '_blank')}
                    className="w-full sm:w-auto"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    E-mail
                    <ExternalLink className="w-3.5 h-3.5 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-lg h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Chat com {selectedContact?.name}
            </DialogTitle>
            {selectedContact && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedContact.phone && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCall(selectedContact.phone!)}
                    className="text-xs"
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    Ligar
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`mailto:${selectedContact.email}`, '_blank')}
                  className="text-xs"
                >
                  <Mail className="w-3 h-3 mr-1" />
                  Email
                </Button>
              </div>
            )}
          </DialogHeader>

          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full p-4">
              {loadingChat ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatMessages.map((msg) => (
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
                disabled={!newMessage.trim() || sendingMessage}
                className="px-3"
              >
                {sendingMessage ? (
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
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactMessagesTab;
