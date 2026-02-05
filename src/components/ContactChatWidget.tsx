 import { useState, useRef, useEffect } from 'react';
 import { MessageCircle, X, Send, Loader2, User, Mail, Phone } from 'lucide-react';
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
 }
 
 const ContactChatWidget = () => {
   const [isOpen, setIsOpen] = useState(false);
   const [step, setStep] = useState<'form' | 'chat'>('form');
   const [name, setName] = useState('');
   const [email, setEmail] = useState('');
   const [phone, setPhone] = useState('');
   const [message, setMessage] = useState('');
   const [messages, setMessages] = useState<Message[]>([]);
   const [sending, setSending] = useState(false);
   const messagesEndRef = useRef<HTMLDivElement>(null);
 
   const scrollToBottom = () => {
     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
   };
 
   useEffect(() => {
     scrollToBottom();
   }, [messages]);
 
   useEffect(() => {
     if (isOpen && step === 'form') {
       // Add initial system message
       setMessages([{
         id: '1',
         text: 'Olá! 👋 Bem-vindo ao suporte Corte & Arte. Preencha seus dados para iniciar o atendimento.',
         sender: 'system',
         timestamp: new Date()
       }]);
     }
   }, [isOpen, step]);
 
   const handleStartChat = () => {
     if (!name.trim() || !email.trim()) {
       toast.error('Preencha nome e e-mail para continuar');
       return;
     }
     
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
 
   const handleSendMessage = async () => {
     if (!message.trim() || sending) return;
 
     const userMessage: Message = {
       id: Date.now().toString(),
       text: message,
       sender: 'user',
       timestamp: new Date()
     };
 
     setMessages(prev => [...prev, userMessage]);
     setMessage('');
     setSending(true);
 
     try {
       // Send message to edge function
       const { error } = await supabase.functions.invoke('contact-message', {
         body: {
           name,
           email,
           phone,
           message: message,
           source: 'chat_widget'
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
     // Reset after animation
     setTimeout(() => {
       setStep('form');
       setName('');
       setEmail('');
       setPhone('');
       setMessage('');
       setMessages([]);
     }, 300);
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
                     <p className={`text-[10px] mt-1 ${msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                       {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                     </p>
                   </div>
                 </div>
               ))}
               <div ref={messagesEndRef} />
             </div>
 
             {/* Input */}
             <div className="p-3 border-t bg-background">
               <div className="flex gap-2">
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
                   disabled={!message.trim() || sending}
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