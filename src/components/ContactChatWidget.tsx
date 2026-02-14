import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, User, Mail, Phone, Paperclip, Mic, Square, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'system' | 'admin';
  timestamp: Date;
  attachment?: {
    name: string;
    type: string;
    url?: string;
  };
  isResolved?: boolean;
}

interface ChatUserData {
  name: string;
  email: string;
  phone: string;
  ticket_id?: string;
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
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [sendingAudio, setSendingAudio] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [isResolved, setIsResolved] = useState(false);
  const [resolvedCountdown, setResolvedCountdown] = useState(15);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastAdminMsgCount, setLastAdminMsgCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load saved user data on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const userData: ChatUserData = JSON.parse(savedData);
        setName(userData.name || '');
        setEmail(userData.email || '');
        setPhone(userData.phone || '');
        if (userData.ticket_id) setTicketId(userData.ticket_id);
      } catch (e) {
        console.error('Error loading saved chat data:', e);
      }
    }
  }, []);

  // Save ticket_id whenever it changes
  useEffect(() => {
    if (ticketId) {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        try {
          const userData: ChatUserData = JSON.parse(savedData);
          userData.ticket_id = ticketId;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
        } catch (e) {}
      }
    }
  }, [ticketId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isResolved]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.log('Could not play notification sound');
    }
  }, []);

  // Load messages from server
  const loadMessagesFromServer = useCallback(async (userEmail: string, tId?: string | null) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-chat-messages', {
        body: { email: userEmail, ticket_id: tId || undefined }
      });

      if (error) throw error;

      if (data?.success && data.messages?.length > 0) {
        if (data.ticket_id && data.ticket_id !== ticketId) {
          setTicketId(data.ticket_id);
        }

        const serverMessages: Message[] = data.messages.map((msg: any) => {
          const isResolvedMsg = msg.message.startsWith('[RESOLVED]');
          return {
            id: msg.id,
            text: isResolvedMsg ? msg.message.replace('[RESOLVED]', '') : msg.message,
            sender: msg.sender_type === 'admin' ? 'admin' as const : 'user' as const,
            timestamp: new Date(msg.created_at),
            isResolved: isResolvedMsg,
          };
        });

        // Check if there's a resolved message
        const hasResolved = serverMessages.some(m => m.isResolved);
        if (hasResolved && !isResolved) {
          setIsResolved(true);
          startResolvedCountdown();
        }

        // Count admin messages for sound notification
        const adminMsgCount = serverMessages.filter(m => m.sender === 'admin').length;

        // Build full message list
        setMessages(prev => {
          const welcomeMsg = prev.find(m => m.id === 'welcome');
          const result: Message[] = [];
          if (welcomeMsg) result.push(welcomeMsg);
          
          const existingIds = new Set(result.map(m => m.id));
          for (const msg of serverMessages) {
            if (!existingIds.has(msg.id)) {
              result.push(msg);
              existingIds.add(msg.id);
            }
          }
          
          return result;
        });

        // Play sound if new admin messages arrived
        if (adminMsgCount > lastAdminMsgCount && lastAdminMsgCount > 0) {
          playNotificationSound();
          if (!isOpen) {
            setUnreadCount(prev => prev + (adminMsgCount - lastAdminMsgCount));
          }
        }
        setLastAdminMsgCount(adminMsgCount);
      }
    } catch (error) {
      console.error('Error loading messages from server:', error);
    }
  }, [ticketId, isResolved, lastAdminMsgCount, isOpen, playNotificationSound]);

  const startResolvedCountdown = useCallback(() => {
    setResolvedCountdown(15);
    if (resolvedTimerRef.current) { clearInterval(resolvedTimerRef.current); resolvedTimerRef.current = null; }
    
    const timer = setInterval(() => {
      setResolvedCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          resolvedTimerRef.current = null;
          // Reset to initial form state
          setIsResolved(false);
          setTicketId(null);
          setLastAdminMsgCount(0);
          const userData: ChatUserData = { name, email, phone };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
          setStep('form');
          setMessages([{
            id: 'welcome',
            text: 'Olá! 👋 Bem-vindo ao suporte Corte & Arte. Preencha seus dados para iniciar o atendimento.',
            sender: 'system',
            timestamp: new Date()
          }]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    resolvedTimerRef.current = timer;
  }, [name, email, phone]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (resolvedTimerRef.current) clearInterval(resolvedTimerRef.current);
      if (pollIntervalRef.current) clearTimeout(pollIntervalRef.current);
    };
  }, []);

  // Poll for new messages when chat is open
  useEffect(() => {
    if (!isOpen || step !== 'chat' || !email) return;

    const poll = () => {
      loadMessagesFromServer(email, ticketId);
      pollIntervalRef.current = setTimeout(poll, 5000);
    };

    loadMessagesFromServer(email, ticketId);
    pollIntervalRef.current = setTimeout(poll, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearTimeout(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isOpen, step, email, ticketId, loadMessagesFromServer]);

  // Also poll even when chat is closed to count unread
  useEffect(() => {
    if (isOpen || !email || step !== 'chat') return;
    
    const poll = () => {
      loadMessagesFromServer(email, ticketId);
      pollIntervalRef.current = setTimeout(poll, 10000);
    };
    pollIntervalRef.current = setTimeout(poll, 10000);

    return () => {
      if (pollIntervalRef.current) {
        clearTimeout(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isOpen, email, step, ticketId, loadMessagesFromServer]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        try {
          const userData: ChatUserData = JSON.parse(savedData);
          if (userData.name && userData.email) {
            setName(userData.name);
            setEmail(userData.email);
            setPhone(userData.phone || '');
            if (userData.ticket_id) setTicketId(userData.ticket_id);
            setStep('chat');
            setMessages([{
              id: 'welcome',
              text: `Olá, ${userData.name}! 👋 Como posso ajudar você hoje?`,
              sender: 'system',
              timestamp: new Date()
            }]);
            return;
          }
        } catch (e) {}
      }

      if (step === 'form') {
        setMessages([{
          id: 'welcome',
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
    
    const userData: ChatUserData = { name: name.trim(), email: email.trim(), phone: phone.trim() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    
    setStep('chat');
    setMessages([{
      id: 'welcome',
      text: `Olá, ${name}! 👋 Como posso ajudar você hoje?`,
      sender: 'system',
      timestamp: new Date()
    }]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 5MB.');
        return;
      }
      setAttachment(file);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async () => {
    if ((!message.trim() && !attachment) || sending) return;

    setSending(true);
    const currentMessage = message;
    const currentAttachment = attachment;
    setMessage('');
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      let attachmentUrl = '';
      let attachmentInfo = '';

      // Upload attachment to storage if present
      if (currentAttachment) {
        const fileName = `chat_${Date.now()}_${currentAttachment.name}`;
        const { error: uploadError } = await supabase.storage
          .from('support-audio') // reuse bucket for all chat attachments
          .upload(fileName, currentAttachment, { contentType: currentAttachment.type });
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          attachmentInfo = `\n\n📎 Anexo: ${currentAttachment.name} (${currentAttachment.type})`;
        } else {
          const { data: { publicUrl } } = supabase.storage.from('support-audio').getPublicUrl(fileName);
          attachmentUrl = publicUrl;
          
          if (currentAttachment.type.startsWith('image/')) {
            attachmentInfo = `\n\n[IMAGE]${publicUrl}`;
          } else if (currentAttachment.type.startsWith('video/')) {
            attachmentInfo = `\n\n[VIDEO]${publicUrl}`;
          } else {
            attachmentInfo = `\n\n[FILE:${currentAttachment.name}]${publicUrl}`;
          }
        }
      }

      const fullMessage = currentMessage + attachmentInfo;

      // Add message locally immediately
      const userMessage: Message = {
        id: `local-${Date.now()}`,
        text: fullMessage,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      let companyId: string | undefined;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: company } = await supabase.from('companies').select('id').eq('user_id', user.id).single();
          if (company) companyId = company.id;
        }
      } catch (e) {}

      const { data, error } = await supabase.functions.invoke('contact-message', {
        body: {
          name, email, phone,
          message: fullMessage,
          source: 'chat_widget',
          company_id: companyId
        }
      });

      if (error) throw error;

      if (data?.ticket_id) {
        setTicketId(data.ticket_id);
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
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
  };

  const handleNewRequestInternal = () => {
    if (resolvedTimerRef.current) { clearInterval(resolvedTimerRef.current); resolvedTimerRef.current = null; }
    setIsResolved(false);
    setTicketId(null);
    setLastAdminMsgCount(0);
    setResolvedCountdown(15);
    const userData: ChatUserData = { name, email, phone };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    setStep('form');
    setMessages([{
      id: 'welcome',
      text: 'Olá! 👋 Bem-vindo ao suporte Corte & Arte. Preencha seus dados para iniciar o atendimento.',
      sender: 'system',
      timestamp: new Date()
    }]);
  };

  const handleNewRequest = () => {
    handleNewRequestInternal();
  };

  const handleContinueSubject = async () => {
    if (resolvedTimerRef.current) { clearInterval(resolvedTimerRef.current); resolvedTimerRef.current = null; }
    setIsResolved(false);
    setResolvedCountdown(15);
    // Reopen ticket by sending a message that reopens it
    if (ticketId) {
      try {
        // The client just continues chatting - remove resolved messages from view
        setMessages(prev => prev.filter(m => !m.isResolved));
      } catch {}
    }
  };

  const handleClearData = () => {
    if (resolvedTimerRef.current) { clearInterval(resolvedTimerRef.current); resolvedTimerRef.current = null; }
    setIsResolved(false);
    setResolvedCountdown(15);
    localStorage.removeItem(STORAGE_KEY);
    setName('');
    setEmail('');
    setPhone('');
    setTicketId(null);
    setLastAdminMsgCount(0);
    setStep('form');
    setMessages([{
      id: 'welcome',
      text: 'Olá! 👋 Bem-vindo ao suporte Corte & Arte. Preencha seus dados para iniciar o atendimento.',
      sender: 'system',
      timestamp: new Date()
    }]);
  };

  // Audio functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true } 
      });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch { toast.error('Não foi possível acessar o microfone. Verifique as permissões.'); }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false); };

  const cancelAudio = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setIsPlayingPreview(false);
    audioPreviewRef.current = null;
  };

  const togglePreview = () => {
    if (!audioUrl) return;
    if (!audioPreviewRef.current) {
      audioPreviewRef.current = new Audio(audioUrl);
      audioPreviewRef.current.onended = () => setIsPlayingPreview(false);
    }
    if (isPlayingPreview) { audioPreviewRef.current.pause(); setIsPlayingPreview(false); }
    else { audioPreviewRef.current.play(); setIsPlayingPreview(true); }
  };

  const sendAudio = async () => {
    if (!audioBlob) return;
    setSendingAudio(true);

    const userMsg: Message = {
      id: `local-audio-${Date.now()}`,
      text: '🎤 Mensagem de áudio',
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const fileName = `client_audio_${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('support-audio')
        .upload(fileName, audioBlob, { contentType: 'audio/webm' });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('support-audio').getPublicUrl(fileName);

      let companyId: string | undefined;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: company } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
          if (company) companyId = company.id;
        }
      } catch {}

      const { data, error } = await supabase.functions.invoke('contact-message', {
        body: { name, email, phone, message: `[AUDIO]${publicUrl}`, source: 'chat_widget', company_id: companyId }
      });

      if (error) throw error;
      if (data?.ticket_id) setTicketId(data.ticket_id);

      cancelAudio();
      toast.success('Áudio enviado!');
    } catch {
      toast.error('Erro ao enviar áudio');
    } finally {
      setSendingAudio(false);
    }
  };

  // Render message content with support for images, videos, audio, and files
  const renderMsgContent = (msg: Message) => {
    const text = msg.text;
    
    // Audio message
    if (text.startsWith('[AUDIO]')) {
      const url = text.replace('[AUDIO]', '');
      return (
        <div>
          <p className="text-sm mb-1">🎤 Áudio</p>
          <audio controls className="max-w-full h-8" preload="metadata">
            <source src={url} type="audio/webm" />
          </audio>
        </div>
      );
    }

    // Parse text for embedded media
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    // Process [IMAGE], [VIDEO], [FILE] tags
    const mediaRegex = /\[IMAGE\](https?:\/\/[^\s\]]+)|\[VIDEO\](https?:\/\/[^\s\]]+)|\[FILE:([^\]]+)\](https?:\/\/[^\s\]]+)/g;
    let lastIndex = 0;
    let match;

    while ((match = mediaRegex.exec(text)) !== null) {
      // Add text before this match
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index).trim();
        if (beforeText) {
          parts.push(<p key={key++} className="text-sm whitespace-pre-wrap">{beforeText}</p>);
        }
      }

      if (match[1]) {
        // Image
        parts.push(
          <div key={key++} className="mt-1">
            <img 
              src={match[1]} 
              alt="Anexo" 
              className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer" 
              onClick={() => window.open(match[1], '_blank')}
            />
          </div>
        );
      } else if (match[2]) {
        // Video
        parts.push(
          <div key={key++} className="mt-1">
            <video 
              controls 
              className="max-w-full rounded-lg max-h-48"
              preload="metadata"
            >
              <source src={match[2]} />
            </video>
          </div>
        );
      } else if (match[3] && match[4]) {
        // File
        parts.push(
          <a 
            key={key++} 
            href={match[4]} 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-1 flex items-center gap-2 p-2 bg-black/10 rounded text-xs hover:bg-black/20 transition-colors"
          >
            <Paperclip className="w-3 h-3" />
            {match[3]}
          </a>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex).trim();
      if (remainingText) {
        parts.push(<p key={key++} className="text-sm whitespace-pre-wrap">{remainingText}</p>);
      }
    }

    if (parts.length === 0) {
      return <p className="text-sm whitespace-pre-wrap">{text}</p>;
    }

    return <>{parts}</>;
  };

  const getSenderLabel = (sender: string) => {
    if (sender === 'admin') return '🛡️ Suporte';
    if (sender === 'user') return '👤 Você';
    return '';
  };

  return (
    <>
      {/* Chat Button with unread badge */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
        aria-label="Abrir chat de suporte"
      >
        <MessageCircle className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
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
                <Input id="chat-name" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="chat-email" className="text-sm flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" />
                  E-mail *
                </Label>
                <Input id="chat-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="chat-phone" className="text-sm flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" />
                  Telefone (opcional)
                </Label>
                <Input id="chat-phone" type="tel" placeholder="(00) 00000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
          <div className="flex flex-col" style={{ height: 'calc(100% - 72px)' }}>
            {/* User Info Bar */}
            <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
              <span className="text-xs text-muted-foreground truncate">
                {name} • {email}
              </span>
              <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={handleClearData}>
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
                        : msg.sender === 'admin'
                        ? 'bg-green-100 dark:bg-green-900/30 rounded-bl-md'
                        : 'bg-muted rounded-bl-md'
                    }`}
                  >
                    {msg.sender !== 'system' && (
                      <p className={`text-[10px] font-medium mb-1 ${msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {getSenderLabel(msg.sender)}
                      </p>
                    )}
                    {renderMsgContent(msg)}
                    <p className={`text-[10px] mt-1 ${msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {/* Resolved state UI */}
              {isResolved && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-3">
                  <p className="text-sm text-center font-medium text-green-700 dark:text-green-400">
                    ✅ Chamado resolvido com sucesso!
                  </p>
                  <p className="text-xs text-center text-muted-foreground">
                    Se precisar de ajuda novamente, escolha uma opção abaixo:
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" onClick={handleNewRequest} className="w-full text-xs">
                      📝 Nova Solicitação
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleContinueSubject} className="w-full text-xs">
                      🔄 Continuar o Assunto
                    </Button>
                  </div>
                  <p className="text-[10px] text-center text-muted-foreground animate-pulse">
                    O chat será reiniciado em {resolvedCountdown} segundos...
                  </p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Audio Preview */}
            {!isResolved && audioBlob && (
              <div className="px-3 py-2 border-t bg-muted/30">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={togglePreview}>
                    {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <span className="flex-1 text-xs text-muted-foreground">Áudio gravado</span>
                  <Button variant="ghost" size="sm" className="text-xs text-destructive h-7" onClick={cancelAudio}>
                    Cancelar
                  </Button>
                  <Button size="sm" className="text-xs h-7" onClick={sendAudio} disabled={sendingAudio}>
                    {sendingAudio ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    <span className="ml-1">Enviar</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Attachment Preview */}
            {!isResolved && !audioBlob && attachment && (
              <div className="px-3 py-2 border-t bg-muted/30">
                <div className="flex items-center gap-2 text-sm">
                  <Paperclip className="w-4 h-4" />
                  <span className="flex-1 truncate">{attachment.name}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleRemoveAttachment}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Input */}
            {!isResolved && !audioBlob && (
              <div className="p-3 border-t bg-background">
                <div className="flex gap-2 items-end">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                  />
                  <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => fileInputRef.current?.click()}>
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
                  {!message.trim() && !attachment ? (
                    <Button
                      variant={isRecording ? "destructive" : "outline"}
                      size="icon"
                      className="shrink-0 h-9 w-9"
                      onClick={isRecording ? stopRecording : startRecording}
                    >
                      {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      className="shrink-0 h-9 w-9"
                      onClick={handleSendMessage}
                      disabled={(!message.trim() && !attachment) || sending}
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  )}
                </div>
                {isRecording && (
                  <p className="text-xs text-destructive animate-pulse text-center mt-1">🔴 Gravando...</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ContactChatWidget;
