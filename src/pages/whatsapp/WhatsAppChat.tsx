import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageCircle, Bot, User, Search } from "lucide-react";

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
}

const WhatsAppChat = () => {
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTenant();
  }, []);

  useEffect(() => {
    if (selectedConversation) loadMessages(selectedConversation.id);
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

    // Mark as read
    await supabase
      .from("whatsapp_conversations")
      .update({ unread_count: 0 })
      .eq("id", conversationId);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !tenantId) return;
    setLoading(true);
    try {
      // Save message locally
      const { error } = await supabase.from("whatsapp_messages").insert({
        tenant_id: tenantId,
        conversation_id: selectedConversation.id,
        contact_id: selectedConversation.contact_id,
        direction: "outbound",
        content: newMessage.trim(),
        message_type: "text",
        is_bot_response: false,
      });
      if (error) throw error;

      // Update conversation preview
      await supabase.from("whatsapp_conversations").update({
        last_message_preview: newMessage.trim().substring(0, 100),
        last_message_at: new Date().toISOString(),
      }).eq("id", selectedConversation.id);

      // TODO: Send via Meta WhatsApp API (Phase 2)

      setNewMessage("");
      loadMessages(selectedConversation.id);
      loadConversations(tenantId);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const name = (c as any).contact?.name || "";
    const phone = (c as any).contact?.phone || "";
    return name.toLowerCase().includes(search.toLowerCase()) || phone.includes(search);
  });

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
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhuma conversa ainda. As conversas aparecerão quando clientes enviarem mensagens via WhatsApp.
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
                    {conv.unread_count > 0 && (
                      <Badge variant="default" className="text-xs">{conv.unread_count}</Badge>
                    )}
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
              <CardTitle className="text-lg">
                {(selectedConversation as any).contact?.name || (selectedConversation as any).contact?.phone}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{(selectedConversation as any).contact?.phone}</p>
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
                        {msg.is_bot_response && (
                          <div className="flex items-center gap-1 mb-1 text-xs opacity-70">
                            <Bot className="h-3 w-3" /> Bot
                          </div>
                        )}
                        <p>{msg.content}</p>
                        <span className="text-[10px] opacity-60 mt-1 block text-right">
                          {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
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
              />
              <Button onClick={handleSendMessage} disabled={loading || !newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Selecione uma conversa para começar</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default WhatsAppChat;
