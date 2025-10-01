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

  const handleSubscribe = async (planType: 'mensal' | 'anual' | 'teste') => {
    // Salvar dados no localStorage para o webhook usar
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      localStorage.setItem('user_email_for_kirvano', user.email || '');
      localStorage.setItem('selected_plan', planType === 'teste' ? 'plano_teste' : planType === 'mensal' ? 'premium_mensal' : 'premium_anual');
    }
    
    const kirvanoUrls = {
      mensal: 'https://pay.kirvano.com/9c9bce9b-547d-435e-91c9-0192f1a067e0',
      anual: 'https://pay.kirvano.com/854ff17c-c700-4c7b-a085-bc216cb822d1',
      teste: 'https://pay.kiwify.com.br/9oNOaqB'
    };
    
    // Abrir o checkout do Kirvano em nova aba
    window.open(kirvanoUrls[planType], '_blank');
    
    toast({
      title: "Redirecionamento para pagamento",
      description: "Você será redirecionado para o Kirvano para finalizar sua assinatura.",
    });
  };

  return (
    <div className="p-3 md:p-6">
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
        
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Escolha seu Plano</h1>
          <p className="text-sm md:text-base text-muted-foreground px-4">
            Desbloqueie todo o potencial da sua barbearia com nossos Planos Premium
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
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

          {/* Plano Premium Mensal */}
          <Card className="relative border-primary shadow-lg">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">
                <Crown className="h-3 w-3 mr-1" />
                Popular
              </Badge>
            </div>
            <CardHeader className="pt-8">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <CardTitle>Premium Mensal</CardTitle>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-primary">R$ 59,90</div>
                <div className="text-sm text-muted-foreground line-through">R$ 79,90</div>
              </div>
              <p className="text-sm text-muted-foreground">primeiro mês com desconto</p>
              <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full w-fit">
                Depois R$ 79,90/mês
              </div>
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
                onClick={() => handleSubscribe('mensal')}
              >
                Assinar Mensalmente
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Flexibilidade para cancelar
              </p>
            </CardContent>
          </Card>

          {/* Plano Premium Anual */}
          <Card className="relative border-green-500 shadow-lg">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-green-600 text-white">
                <Star className="h-3 w-3 mr-1" />
                Melhor Valor
              </Badge>
            </div>
            <CardHeader className="pt-8">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-green-600" />
                <CardTitle>Premium Anual</CardTitle>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-green-600">R$ 500</div>
                <div className="text-sm text-muted-foreground line-through">R$ 958,80</div>
              </div>
              <p className="text-sm text-muted-foreground">pagamento à vista</p>
              <div className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full w-fit">
                Economize R$ 458,80 por ano
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Tudo do plano mensal</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">2 meses gratuitos</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Suporte prioritário VIP</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Recursos beta em primeiro</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Consultoria personalizada</span>
                </li>
              </ul>
              <Button 
                className="w-full mt-6 bg-green-600 hover:bg-green-700" 
                onClick={() => handleSubscribe('anual')}
              >
                Assinar Anualmente
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Melhor custo-benefício
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Todos os preços são em Reais (BRL). Pagamento processado via Kirvano.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Cancele a qualquer momento. Sem taxas de cancelamento.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Planos;