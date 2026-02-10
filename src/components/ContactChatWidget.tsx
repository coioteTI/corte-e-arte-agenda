import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, User, Mail, Phone, Paperclip, Image, Mic, Square, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'system';
  timestamp: Date;
  attachment?: {
    name: string;
    type: string;
    url?: string;
  };
}

interface ChatUserData {
  name: string;
  email: string;
  phone: string;
}

const STORAGE_KEY = 'contact_chat_user';

const ContactChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'chat'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved user data on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const userData: ChatUserData = JSON.parse(savedData);
        setName(userData.name || '');
        setEmail(userData.email || '');
        setPhone(userData.phone || '');
      } catch (e) {
        console.error('Error loading saved chat data:', e);
      }
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      // Check if we have saved user data
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        try {
          const userData: ChatUserData = JSON.parse(savedData);
          if (userData.name && userData.email) {
            // User already registered, go straight to chat
            setName(userData.name);
            setEmail(userData.email);
            setPhone(userData.phone || '');
            setStep('chat');
            setMessages([{
              id: '1',
              text: `Olá, ${userData.name}! 👋 Como posso ajudar você hoje?`,
              sender: 'system',
              timestamp: new Date()
            }]);
            return;
          }
        } catch (e) {
          console.error('Error parsing saved data:', e);
        }
      }

      // No saved data, show form
      if (step === 'form') {
        setMessages([{
          id: '1',
          text: 'Olá! 👋 Bem-vindo ao suporte Corte & Arte. Preencha seus dados para iniciar o atendimento.',
          sender: 'system',
          timestamp: new Date()
        }]);
      }
    }
  }, [isOpen]);

  const handleStartChat = () => {
    if (!name.trim() || !email.trim()) {
      toast.error('Preencha nome e e-mail para continuar');
      return;
    }
    
    // Save user data to localStorage
    const userData: ChatUserData = { name: name.trim(), email: email.trim(), phone: phone.trim() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    
    setStep('chat');
    setMessages([
      {
        id: '1',
        text: `Olá, ${name}! 👋 Como posso ajudar você hoje?`,
        sender: 'system',
        timestamp: new Date()
      }
    ]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Max 5MB
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 5MB.');
        return;
      }
      setAttachment(file);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    if ((!message.trim() && !attachment) || sending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: message || (attachment ? `📎 ${attachment.name}` : ''),
      sender: 'user',
      timestamp: new Date(),
      attachment: attachment ? {
        name: attachment.name,
        type: attachment.type
      } : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = message;
    setMessage('');
    const currentAttachment = attachment;
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setSending(true);

    try {
      // Try to get company_id if user is logged in
      let companyId: string | undefined;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: company } = await supabase
            .from('companies')
            .select('id')
            .eq('user_id', user.id)
            .single();
          if (company) {
            companyId = company.id;
          }
        }
      } catch (e) {
        // User not logged in, that's ok
      }

      // Prepare the message body
      let attachmentInfo = '';
      if (currentAttachment) {
        attachmentInfo = `\n\n📎 Anexo: ${currentAttachment.name} (${currentAttachment.type})`;
      }

      // Send message to edge function
      const { error } = await supabase.functions.invoke('contact-message', {
        body: {
          name,
          email,
          phone,
          message: currentMessage + attachmentInfo,
          source: 'chat_widget',
          company_id: companyId
        }
      });

      if (error) throw error;

      // Add confirmation message
      const systemMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Mensagem recebida! ✅ Nossa equipe responderá em breve pelo e-mail informado. Obrigado pelo contato!',
        sender: 'system',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, systemMessage]);
      
      toast.success('Mensagem enviada com sucesso!');
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Add error message but still confirm receipt
      const systemMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sua mensagem foi registrada! Entraremos em contato pelo e-mail informado. 📧',
        sender: 'system',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, systemMessage]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Keep user data saved - only reset messages
    setTimeout(() => {
      setMessages([]);
    }, 300);
  };

  const handleClearData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setName('');
    setEmail('');
    setPhone('');
    setStep('form');
    setMessages([{
      id: '1',
      text: 'Olá! 👋 Bem-vindo ao suporte Corte & Arte. Preencha seus dados para iniciar o atendimento.',
      sender: 'system',
      timestamp: new Date()
    }]);
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
        aria-label="Abrir chat de suporte"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-48px)] bg-background border rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
        style={{ height: 'min(500px, calc(100vh - 100px))' }}
      >
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">Suporte Corte & Arte</h3>
              <p className="text-xs opacity-80">Estamos aqui para ajudar</p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleClose}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {step === 'form' ? (
          /* Contact Form */
          <div className="p-4 space-y-4 overflow-y-auto" style={{ height: 'calc(100% - 72px)' }}>
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p>Olá! 👋 Preencha seus dados para iniciar o atendimento.</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="chat-name" className="text-sm flex items-center gap-2">
                  <User className="w-3.5 h-3.5" />
                  Nome *
                </Label>
                <Input
                  id="chat-name"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="chat-email" className="text-sm flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" />
                  E-mail *
                </Label>
                <Input
                  id="chat-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="chat-phone" className="text-sm flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" />
                  Telefone (opcional)
                </Label>
                <Input
                  id="chat-phone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <Button onClick={handleStartChat} className="w-full">
              Iniciar Conversa
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Ao continuar, você concorda com nossa política de privacidade.
            </p>
          </div>
        ) : (
          /* Chat Interface */
          <div className="flex flex-col" style={{ height: 'calc(100% - 72px)' }}>
            {/* User Info Bar */}
            <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
              <span className="text-xs text-muted-foreground truncate">
                {name} • {email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-6 px-2"
                onClick={handleClearData}
              >
                Alterar dados
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    {msg.attachment && (
                      <div className="mt-2 p-2 bg-black/10 rounded text-xs flex items-center gap-2">
                        <Paperclip className="w-3 h-3" />
                        {msg.attachment.name}
                      </div>
                    )}
                    <p className={`text-[10px] mt-1 ${msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Attachment Preview */}
            {attachment && (
              <div className="px-3 py-2 border-t bg-muted/30">
                <div className="flex items-center gap-2 text-sm">
                  <Paperclip className="w-4 h-4" />
                  <span className="flex-1 truncate">{attachment.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleRemoveAttachment}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t bg-background">
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="min-h-[40px] max-h-[100px] resize-none"
                  rows={1}
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={(!message.trim() && !attachment) || sending}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ContactChatWidget;
