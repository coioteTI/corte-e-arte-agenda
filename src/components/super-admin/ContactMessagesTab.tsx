import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MessageCircle, 
  Mail, 
  Phone, 
  Calendar, 
  Search,
  RefreshCw,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
}

const ContactMessagesTab = () => {
  const { session } = useSuperAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

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
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary" />
            Mensagens de Contato
          </h2>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} mensagens não lidas` : 'Todas as mensagens lidas'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou mensagem..."
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
          >
            Todas
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
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
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${!msg.is_read ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {msg.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {msg.name}
                        {!msg.is_read && (
                          <Badge variant="default" className="text-xs">Novo</Badge>
                        )}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                        <a 
                          href={`mailto:${msg.email}`} 
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          {msg.email}
                        </a>
                        {msg.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {msg.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(msg.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{msg.source}</Badge>
                    {!msg.is_read && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleMarkAsRead(msg.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Marcar como lida
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => window.open(`mailto:${msg.email}?subject=Re: Mensagem de Contato - Corte & Arte`, '_blank')}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Responder por E-mail
                    <ExternalLink className="w-3.5 h-3.5 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContactMessagesTab;
