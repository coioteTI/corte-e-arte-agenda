import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Planos = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubscribe = async () => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Abrir o checkout do Stripe em nova aba
        window.open(data.url, '_blank');
      }
      
    } catch (error: any) {
      console.error("Erro ao processar assinatura:", error);
      toast({
        title: "Erro na assinatura",
        description: error.message || "Erro ao processar pagamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Escolha seu Plano</h1>
          <p className="text-muted-foreground">
            Desbloqueie todo o potencial da sua barbearia com nosso Plano Premium
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Plano Gratuito */}
          <Card className="relative">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Plano Gratuito</CardTitle>
              </div>
              <Badge variant="secondary" className="w-fit">Atual</Badge>
              <div className="text-3xl font-bold">R$ 0</div>
              <p className="text-sm text-muted-foreground">Para sempre</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Cadastro básico da empresa</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Perfil público limitado</span>
                </li>
                <li className="flex items-center gap-2 opacity-50">
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                  <span className="text-sm line-through">Sistema de agendamentos</span>
                </li>
                <li className="flex items-center gap-2 opacity-50">
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                  <span className="text-sm line-through">Gestão de clientes</span>
                </li>
                <li className="flex items-center gap-2 opacity-50">
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                  <span className="text-sm line-through">Relatórios avançados</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full mt-6" disabled>
                Plano Atual
              </Button>
            </CardContent>
          </Card>

          {/* Plano Premium */}
          <Card className="relative border-primary shadow-lg">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">
                <Crown className="h-3 w-3 mr-1" />
                Recomendado
              </Badge>
            </div>
            <CardHeader className="pt-8">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <CardTitle>Plano Premium</CardTitle>
              </div>
              <div className="text-3xl font-bold text-primary">R$ 59</div>
              <p className="text-sm text-muted-foreground">por mês</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Tudo do plano gratuito</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Sistema completo de agendamentos</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Gestão de clientes e serviços</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Controle de horários e profissionais</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Relatórios e análises avançadas</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Suporte prioritário</span>
                </li>
              </ul>
              <Button 
                className="w-full mt-6" 
                onClick={handleSubscribe}
                disabled={isLoading}
              >
                {isLoading ? "Processando..." : "Assinar Agora"}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Cancele a qualquer momento
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Todos os preços são em Reais (BRL). Cobrança recorrente mensal.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Planos;