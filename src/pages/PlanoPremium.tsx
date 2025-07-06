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
    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para continuar.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (data.url) {
        // Abrir Stripe checkout em nova aba
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Erro ao processar pagamento",
        description: error.message || "Ocorreu um erro ao criar a sessão de pagamento.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
            {/* Plano Premium */}
            <div className="border-2 border-primary rounded-lg p-6 bg-primary/5">
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold text-primary">Plano Premium</h3>
                <div className="text-3xl font-bold mt-2">R$ 59<span className="text-lg font-normal">/mês</span></div>
                <p className="text-muted-foreground">Tudo que você precisa para gerenciar sua empresa</p>
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
                onClick={handleSubscribe}
                className="w-full" 
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? "Processando..." : "Assinar Agora"}
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