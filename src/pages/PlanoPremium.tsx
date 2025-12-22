import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PlanoPremium = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const nomeBarbearia = localStorage.getItem('nomeBarbearia') || '';

  const handleSubscribe = async () => {
    // Salvar dados no localStorage para o webhook usar
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      localStorage.setItem('user_email_for_kirvano', user.email || '');
      localStorage.setItem('selected_plan', 'premium_mensal');
    }
    
    const kirvanoUrl = 'https://pay.kirvano.com/9c9bce9b-547d-435e-91c9-0192f1a067e0';
    
    // Abrir o checkout do Kirvano em nova aba
    window.open(kirvanoUrl, '_blank');
    
    toast({
      title: "Redirecionamento para pagamento",
      description: "Você será redirecionado para o Kirvano para finalizar sua assinatura.",
    });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader className="text-center">
            <img 
              src={logo} 
              alt="Corte & Arte" 
              className="h-12 w-auto mx-auto mb-4"
            />
            <CardTitle className="text-xl">
              Bem-vindo, {nomeBarbearia}!
            </CardTitle>
            <p className="text-muted-foreground">
              Escolha seu plano para começar a usar nossa plataforma
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Plano Premium Mensal */}
            <div className="border-2 border-primary rounded-lg p-6 bg-primary/5">
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold text-primary">Plano Premium</h3>
                <div className="text-3xl font-bold mt-2">R$ 79,90<span className="text-lg font-normal">/mês</span></div>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Agenda ilimitada de agendamentos</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Notificações automáticas por WhatsApp</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Relatórios avançados de vendas</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Sistema de fidelização de clientes</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Perfil público para agendamentos online</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Suporte técnico prioritário</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary" />
                  <span>Backup automático dos dados</span>
                </div>
              </div>

              <Button 
                onClick={() => handleSubscribe()}
                className="w-full" 
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? "Processando..." : "Assinar Agora - R$ 79,90/mês"}
              </Button>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                ✓ Cancele a qualquer momento<br />
                ✓ Primeira cobrança após 7 dias grátis<br />
                ✓ Suporte completo incluído
              </p>
            </div>
            
            <div className="text-center">
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
                ← Voltar ao início
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlanoPremium;