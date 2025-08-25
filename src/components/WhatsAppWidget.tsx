import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { MessageCircle, X } from "lucide-react";

interface WhatsAppWidgetProps {
  companyPhone?: string;
  companyName?: string;
}

const WhatsAppWidget = ({ companyPhone, companyName = "barbearia" }: WhatsAppWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Don't render if no phone number is provided
  if (!companyPhone) {
    return null;
  }

  return (
    <>
      {/* Botão Flutuante */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse-glow z-50"
            style={{ backgroundColor: '#25D366' }}
          >
            <MessageCircle className="h-7 w-7 text-white" />
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-4xl h-[80vh] p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Contato WhatsApp
            </DialogTitle>
            <DialogDescription>
              Envie uma mensagem via WhatsApp para entrar em contato.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 p-4">
            <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center space-y-4">
                <MessageCircle className="h-16 w-16 mx-auto text-green-600" />
                <div>
                  <h3 className="font-semibold mb-2">Contato WhatsApp</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Clique no botão abaixo para abrir o WhatsApp e enviar uma mensagem
                  </p>
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        const message = `Olá! Gostaria de agendar um horário na ${companyName}.`;
                        const phone = companyPhone.replace(/\D/g, '');
                        const linkMobile = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
                        const linkWeb = `https://web.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(message)}`;
                        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                        
                        try {
                          window.open(isMobile ? linkMobile : linkWeb, '_blank');
                        } catch (error) {
                          window.open(isMobile ? linkWeb : linkMobile, '_blank');
                        }
                      }}
                      className="w-full"
                      style={{ backgroundColor: '#25D366' }}
                    >
                      Enviar Mensagem WhatsApp
                    </Button>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                      Fechar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WhatsAppWidget;