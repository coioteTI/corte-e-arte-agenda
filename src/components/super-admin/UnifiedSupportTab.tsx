import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSuperAdmin } from "@/contexts/SuperAdminContext";
import SupportChatDialog from "./SupportChatDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  MessageSquare, Clock, CheckCircle, AlertCircle,
  Loader2, Search, Filter, Building2, RefreshCw,
  Mail, Phone, Calendar, Send, MessageCircle, ExternalLink,
  Mic, Square, Play, Pause
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  unread_count: number;
  companies: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
  } | null;
}

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

interface TicketStats {
  open: number;
  in_progress: number;
  resolved: number;
  total: number;
}

const SUPABASE_URL = "https://gwyickztdeiplccievyt.supabase.co";

const UnifiedSupportTab = () => {
  const { session } = useSuperAdmin();
  
  // Tickets state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats>({ open: 0, in_progress: 0, resolved: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [activeSubTab, setActiveSubTab] = useState<"tickets" | "contacts">("tickets");

  // Chat dialog state
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Contact chat state
  const [contactChatOpen, setContactChatOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactMessage | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [sendingAudio, setSendingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Fetch contact messages
  const { data: contactMessages, isLoading: loadingContacts, refetch: refetchContacts } = useQuery({
    queryKey: ['super-admin-contact-messages', session?.token],
    queryFn: async () => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/super-admin-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': session?.token || '',
        },
        body: JSON.stringify({ action: 'get_contact_messages' }),
      });

      if (!response.ok) throw new Error('Failed to fetch contact messages');
      const data = await response.json();
      return (data.data?.messages || data.messages || []) as ContactMessage[];
    },
    enabled: !!session?.token,
  });

  useEffect(() => {
    loadTicketData();
  }, [session]);

  const loadTicketData = async () => {
    if (!session?.token) return;
    setLoading(true);
    
    try {
      const [ticketsResponse, statsResponse] = await Promise.all([
        fetch(`${SUPABASE_URL}/functions/v1/super-admin-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-super-admin-token': session.token
          },
          body: JSON.stringify({ action: 'get_tickets', params: {} })
        }),
        fetch(`${SUPABASE_URL}/functions/v1/super-admin-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-super-admin-token': session.token
          },
          body: JSON.stringify({ action: 'get_ticket_stats' })
        })
      ]);
      
      const ticketsData = await ticketsResponse.json();
      const statsData = await statsResponse.json();
      
      if (ticketsData.success) setTickets(ticketsData.data || []);
      if (statsData.success) setStats(statsData.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error("Não foi possível carregar os tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadTicketData();
    refetchContacts();
  };

  const handleOpenTicketChat = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowChatDialog(true);
  };

  const handleTicketResolved = () => {
    loadTicketData();
  };

  // Contact handlers
  const handleMarkAsRead = async (messageId: string) => {
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/super-admin-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': session?.token || '',
        },
        body: JSON.stringify({
          action: 'mark_contact_read',
          params: { message_id: messageId },
        }),
      });
      refetchContacts();
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleOpenContactChat = async (contact: ContactMessage) => {
    setSelectedContact(contact);
    setContactChatOpen(true);
    setLoadingChat(true);

    if (!contact.is_read) {
      handleMarkAsRead(contact.id);
    }

    if (contact.ticket_id) {
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/super-admin-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-super-admin-token': session?.token || '',
          },
          body: JSON.stringify({
            action: 'get_ticket_details',
            params: { ticket_id: contact.ticket_id },
          }),
        });
        const data = await response.json();
        if (data.success) {
          setChatMessages(data.data.messages || []);
        }
      } catch (error) {
        console.error('Error loading chat:', error);
      }
    } else {
      setChatMessages([{
        id: contact.id,
        sender_type: 'company',
        message: contact.message,
        created_at: contact.created_at
      }]);
    }
    setLoadingChat(false);
  };

  const handleSendContactMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;
    setSendingMessage(true);

    try {
      if (selectedContact.ticket_id) {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/super-admin-data`, {
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
        });
        const data = await response.json();
        if (data.success) {
          setNewMessage('');
          const detailsResponse = await fetch(`${SUPABASE_URL}/functions/v1/super-admin-data`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-super-admin-token': session?.token || '',
            },
            body: JSON.stringify({
              action: 'get_ticket_details',
              params: { ticket_id: selectedContact.ticket_id },
            }),
          });
          const detailsData = await detailsResponse.json();
          if (detailsData.success) {
            setChatMessages(detailsData.data.messages || []);
          }
          toast.success('Mensagem enviada');
        }
      } else {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/super-admin-data`, {
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
        });
        const data = await response.json();
        if (data.success) {
          setNewMessage('');
          setChatMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            sender_type: 'admin',
            message: newMessage,
            created_at: new Date().toISOString()
          }]);
          
          if (data.ticket_id) {
            setSelectedContact(prev => prev ? { ...prev, ticket_id: data.ticket_id } : null);
          }
          
          toast.success('Resposta enviada');
          refetchContacts();
          loadTicketData();
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
      handleSendContactMessage();
    }
  };

  // Audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast.error('Não foi possível acessar o microfone');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const cancelAudio = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setIsPlayingAudio(false);
  };

  const togglePlayAudio = () => {
    if (!audioUrl) return;
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio(audioUrl);
      audioPlayerRef.current.onended = () => setIsPlayingAudio(false);
    }
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const sendAudioMessage = async () => {
    if (!audioBlob || !selectedContact) return;
    setSendingAudio(true);

    try {
      const fileName = `audio_${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('support-audio')
        .upload(fileName, audioBlob, { contentType: 'audio/webm' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('support-audio')
        .getPublicUrl(fileName);

      const audioMessage = `[AUDIO]${publicUrl}`;

      if (selectedContact.ticket_id) {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/super-admin-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-super-admin-token': session?.token || '',
          },
          body: JSON.stringify({
            action: 'send_ticket_message',
            params: { ticket_id: selectedContact.ticket_id, message: audioMessage },
          }),
        });
        const data = await response.json();
        if (data.success) {
          cancelAudio();
          const detailsResponse = await fetch(`${SUPABASE_URL}/functions/v1/super-admin-data`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-super-admin-token': session?.token || '',
            },
            body: JSON.stringify({
              action: 'get_ticket_details',
              params: { ticket_id: selectedContact.ticket_id },
            }),
          });
          const detailsData = await detailsResponse.json();
          if (detailsData.success) setChatMessages(detailsData.data.messages || []);
          toast.success('Áudio enviado');
        }
      } else {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/super-admin-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-super-admin-token': session?.token || '',
          },
          body: JSON.stringify({
            action: 'reply_to_contact',
            params: {
              contact_id: selectedContact.id,
              message: audioMessage,
              contact_email: selectedContact.email,
              contact_name: selectedContact.name,
            },
          }),
        });
        const data = await response.json();
        if (data.success) {
          cancelAudio();
          setChatMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            sender_type: 'admin',
            message: audioMessage,
            created_at: new Date().toISOString()
          }]);
          if (data.ticket_id) {
            setSelectedContact(prev => prev ? { ...prev, ticket_id: data.ticket_id } : null);
          }
          toast.success('Áudio enviado');
          refetchContacts();
          loadTicketData();
        }
      }
    } catch {
      toast.error('Erro ao enviar áudio');
    } finally {
      setSendingAudio(false);
    }
  };

  // Helper to render message content (text or audio)
  const renderMessageContent = (message: string) => {
    if (message.startsWith('[AUDIO]')) {
      const url = message.replace('[AUDIO]', '');
      return (
        <audio controls className="max-w-full" preload="metadata">
          <source src={url} type="audio/webm" />
          Seu navegador não suporta áudio.
        </audio>
      );
    }
    return <p className="text-sm whitespace-pre-wrap">{message}</p>;
  };

  // Badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200"><Clock className="h-3 w-3 mr-1" /> Aberto</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200"><MessageSquare className="h-3 w-3 mr-1" /> Em Atendimento</Badge>;
      case "resolved":
        return <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200"><CheckCircle className="h-3 w-3 mr-1" /> Resolvido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive">Urgente</Badge>;
      case "high":
        return <Badge className="bg-orange-500 hover:bg-orange-600">Alta</Badge>;
      case "normal":
        return <Badge variant="secondary">Normal</Badge>;
      case "low":
        return <Badge variant="outline">Baixa</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  // Filters
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ticket.companies?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const filteredContacts = (contactMessages || []).filter(msg => {
    const matchesSearch = 
      msg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const unreadContactsCount = (contactMessages || []).filter(m => !m.is_read).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 p-3 sm:p-4">
            <div className="flex flex-col gap-1">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
              <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.open}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Abertos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 p-3 sm:p-4">
            <div className="flex flex-col gap-1">
              <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
              <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.in_progress}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Em Atendimento</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 p-3 sm:p-4">
            <div className="flex flex-col gap-1">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
              <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.resolved}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Resolvidos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 p-3 sm:p-4">
            <div className="flex flex-col gap-1">
              <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
              <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tabs for Tickets vs Contacts */}
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as "tickets" | "contacts")}>
        <div className="flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="tickets" className="flex-1 sm:flex-none gap-2">
              <MessageSquare className="h-4 w-4" />
              Chamados
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex-1 sm:flex-none gap-2">
              <Mail className="h-4 w-4" />
              Contatos
              {unreadContactsCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">{unreadContactsCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          {activeSubTab === "tickets" && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="open">Abertos</SelectItem>
                  <SelectItem value="in_progress">Em Atendimento</SelectItem>
                  <SelectItem value="resolved">Resolvidos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-[130px]">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Tickets List */}
        <TabsContent value="tickets" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Chamados ({filteredTickets.length})</CardTitle>
              <CardDescription>Clique em um chamado para abrir o chat</CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum chamado encontrado</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] sm:h-[500px]">
                  <div className="space-y-2 p-4 sm:p-0">
                    {filteredTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => handleOpenTicketChat(ticket)}
                        className="p-3 sm:p-4 cursor-pointer border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start gap-2">
                            <h4 className="font-medium text-sm line-clamp-2 flex-1">{ticket.subject}</h4>
                            {ticket.unread_count > 0 && (
                              <Badge variant="destructive" className="text-xs flex-shrink-0">
                                {ticket.unread_count}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {ticket.companies?.name || "Empresa"}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {getPriorityBadge(ticket.priority)}
                            {getStatusBadge(ticket.status)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(ticket.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts List */}
        <TabsContent value="contacts" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Mensagens de Contato ({filteredContacts.length})</CardTitle>
              <CardDescription>Mensagens recebidas do widget de contato</CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              {loadingContacts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhuma mensagem encontrada</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] sm:h-[500px]">
                  <div className="space-y-3 p-4 sm:p-0">
                    {filteredContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className={`p-3 sm:p-4 border rounded-lg transition-colors ${!contact.is_read ? 'border-primary/50 bg-primary/5' : ''}`}
                      >
                        <div className="flex flex-col gap-3">
                          {/* Header with avatar and name */}
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!contact.is_read ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                              {contact.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm truncate">{contact.name}</span>
                                {!contact.is_read && (
                                  <Badge variant="default" className="text-xs">Novo</Badge>
                                )}
                                <Badge variant="outline" className="text-xs">{contact.source}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(contact.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>

                          {/* Contact info */}
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-2">
                              <Mail className="w-3 h-3" />
                              {contact.email}
                            </span>
                            {contact.phone && (
                              <span className="flex items-center gap-2">
                                <Phone className="w-3 h-3" />
                                {contact.phone}
                              </span>
                            )}
                          </div>

                          {/* Message preview */}
                          <div className="bg-muted/50 rounded-lg p-2 sm:p-3">
                            <p className="text-sm line-clamp-2">{contact.message}</p>
                          </div>

                          {/* Actions - stacked vertically on mobile */}
                          <div className="flex flex-col gap-2">
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => handleOpenContactChat(contact)}
                              className="w-full"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Responder no Chat
                            </Button>
                            
                            <div className="flex gap-2">
                              {contact.phone && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleCall(contact.phone!)}
                                  className="flex-1"
                                >
                                  <Phone className="w-4 h-4 mr-2" />
                                  Ligar
                                </Button>
                              )}
                              
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(`mailto:${contact.email}?subject=Re: Mensagem de Contato`, '_blank')}
                                className="flex-1"
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                E-mail
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ticket Chat Dialog */}
      <SupportChatDialog
        open={showChatDialog}
        onOpenChange={setShowChatDialog}
        ticket={selectedTicket}
        onTicketResolved={handleTicketResolved}
      />

      {/* Contact Chat Dialog */}
      <Dialog open={contactChatOpen} onOpenChange={setContactChatOpen}>
        <DialogContent className="max-w-lg h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Chat com {selectedContact?.name}
            </DialogTitle>
            {selectedContact && (
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex flex-wrap gap-2">
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
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.sender_type === 'admin' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}
                      >
                        {renderMessageContent(msg.message)}
                        <p className={`text-xs mt-1 ${msg.sender_type === 'admin' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
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
                className="min-h-[60px] resize-none"
                rows={2}
              />
              <Button 
                onClick={handleSendContactMessage} 
                disabled={sendingMessage || !newMessage.trim()}
                className="flex-shrink-0"
              >
                {sendingMessage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedSupportTab;
