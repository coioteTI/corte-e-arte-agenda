import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageCircle, Bot, User, Search, Loader2, CheckCheck } from "lucide-react";

interface Conversation {
  id: string;
  contact_id: string;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  contact?: { name: string | null; phone: string };
}

interface Message {
  id: string;
  direction: string;
  content: string | null;
  message_type: string;
  is_bot_response: boolean;
  created_at: string;
  status: string | null;
}

const WhatsAppChat = () => {
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedConvRef = useRef<string | null>(null);

  useEffect(() => { loadTenant(); }, []);

  useEffect(() => {
    if (selectedConversation) {
      selectedConvRef.current = selectedConversation.id;
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel("whatsapp-messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message & { conversation_id?: string };
          // If it's for the currently selected conversation, add it
          if (newMsg.conversation_id === selectedConvRef.current) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
          // Refresh conversations list
          loadConversations(tenantId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  const loadTenant = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("whatsapp_tenants").select("id").eq("user_id", user.id).maybeSingle();
    if (data) {
      setTenantId(data.id);
      loadConversations(data.id);
    }
  };

  const loadConversations = async (tId: string) => {
    const { data } = await supabase
      .from("whatsapp_conversations")
      .select("*, contact:whatsapp_contacts(name, phone)")
      .eq("tenant_id", tId)
      .order("last_message_at", { ascending: false });
    if (data) setConversations(data as any);
  };

  const loadMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);

    await supabase
      .from("whatsapp_conversations")
      .update({ unread_count: 0 })
      .eq("id", conversationId);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !tenantId) return;
    setSending(true);

    const messageText = newMessage.trim();
    setNewMessage("");

    // Optimistic update
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      direction: "outbound",
      content: messageText,
      message_type: "text",
      is_bot_response: false,
      created_at: new Date().toISOString(),
      status: "sending",
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-message", {
        body: {
          tenantId,
          contactId: selectedConversation.contact_id,
          conversationId: selectedConversation.id,
          message: messageText,
        },
      });

      if (error) throw error;

      // Remove optimistic msg (realtime will add the real one)
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      
      // Reload to get the real message
      await loadMessages(selectedConversation.id);
      loadConversations(tenantId);
    } catch (err: any) {
      // Remove optimistic on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const name = (c as any).contact?.name || "";
    const phone = (c as any).contact?.phone || "";
    return name.toLowerCase().includes(search.toLowerCase()) || phone.includes(search);
  });

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Conversations List */}
      <Card className="w-80 flex-shrink-0 flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" /> Conversas
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhuma conversa ainda.
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`p-3 cursor-pointer border-b transition-colors hover:bg-muted/50 ${
                    selectedConversation?.id === conv.id ? "bg-muted" : ""
                  }`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">
                      {(conv as any).contact?.name || (conv as any).contact?.phone || "Desconhecido"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">{formatTime(conv.last_message_at)}</span>
                      {conv.unread_count > 0 && (
                        <Badge variant="default" className="text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {conv.last_message_preview || "Sem mensagens"}
                  </p>
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {(selectedConversation as any).contact?.name || (selectedConversation as any).contact?.phone}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{(selectedConversation as any).contact?.phone}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  <div className="h-2 w-2 rounded-full bg-green-500 mr-1.5" />
                  Online
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full p-4">
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg text-sm ${
                          msg.direction === "outbound"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {msg.direction === "outbound" && (
                          <div className="flex items-center gap-1 mb-1 text-[10px] opacity-70">
                            {msg.is_bot_response ? (
                              <><Bot className="h-3 w-3" /> Bot</>
                            ) : (
                              <><User className="h-3 w-3" /> Você</>
                            )}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] opacity-60">
                            {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {msg.direction === "outbound" && msg.status === "sent" && (
                            <CheckCheck className="h-3 w-3 opacity-60" />
                          )}
                          {msg.direction === "outbound" && msg.status === "sending" && (
                            <Loader2 className="h-3 w-3 opacity-60 animate-spin" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
            <div className="p-3 border-t flex gap-2">
              <Input
                placeholder="Digite sua mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                disabled={sending}
              />
              <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Selecione uma conversa</p>
              <p className="text-xs mt-1">As conversas aparecerão quando clientes enviarem mensagens</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default WhatsAppChat;
